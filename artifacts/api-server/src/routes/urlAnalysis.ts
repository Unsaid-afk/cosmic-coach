import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  transcribeAudio,
  buildTranscriptSegments,
  generateWaveformFromWords,
  analyzeTranscriptWithAI,
  markGoldenMomentsInSegments,
} from "../lib/speechAnalysis.js";
import { downloadMediaFromUrl } from "../lib/urlDownloader.js";

const router = Router();

// POST /api/sessions/from-url
router.post("/sessions/from-url", async (req, res) => {
  const log = req.log;
  const { title, speakerName, url } = req.body as {
    title?: string;
    speakerName?: string;
    url?: string;
  };

  if (!title || !speakerName || !url) {
    return res.status(400).json({ error: "title, speakerName, and url are required" });
  }

  // Quick URL sanity check
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Only HTTP/HTTPS URLs are supported" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // Create session immediately
  const [session] = await db
    .insert(sessionsTable)
    .values({
      title,
      speakerName,
      duration: 0,
      status: "processing",
      overallScore: 0,
      energyLevel: "medium",
      eyeContactScore: 0,
      confidenceScore: 0,
      fillerWordCount: 0,
    })
    .returning();

  res.status(202).json({
    id: String(session.id),
    title: session.title,
    speakerName: session.speakerName,
    duration: session.duration,
    createdAt: session.createdAt.toISOString(),
    status: session.status,
    overallScore: session.overallScore,
    energyLevel: session.energyLevel,
    eyeContactScore: session.eyeContactScore,
    confidenceScore: session.confidenceScore,
    fillerWordCount: session.fillerWordCount,
  });

  // Process async
  processUrl(session.id, url, speakerName, log).catch((err) => {
    log.error({ err }, "URL processing failed");
  });
});

async function processUrl(
  sessionId: number,
  url: string,
  speakerName: string,
  log: import("pino").Logger,
) {
  try {
    log.info({ sessionId, url }, "Downloading media from URL");

    const { buffer, mimeType } = await downloadMediaFromUrl(url);
    log.info({ sessionId, bytes: buffer.length, mimeType }, "Download complete");

    const { text, words, duration } = await transcribeAudio(buffer, mimeType);
    log.info({ sessionId, wordCount: words.length, duration }, "Transcription complete");

    const [rawSegments, waveform, analysis] = await Promise.all([
      Promise.resolve(buildTranscriptSegments(words)),
      Promise.resolve(generateWaveformFromWords(words, duration)),
      analyzeTranscriptWithAI(text, words, duration, speakerName),
    ]);

    const segments = markGoldenMomentsInSegments(rawSegments, analysis);

    await db
      .update(sessionsTable)
      .set({
        status: "ready",
        duration: analysis.duration,
        overallScore: analysis.overallScore,
        energyLevel: analysis.energyLevel,
        eyeContactScore: analysis.eyeContactScore,
        confidenceScore: analysis.confidenceScore,
        fillerWordCount: analysis.fillerWordCount,
        transcriptData: segments as unknown as Record<string, unknown>[],
        analysisData: analysis as unknown as Record<string, unknown>,
        waveformData: waveform as unknown as Record<string, unknown>[],
      })
      .where(eq(sessionsTable.id, sessionId));

    log.info({ sessionId }, "URL session processing complete");
  } catch (err) {
    log.error({ err, sessionId }, "URL processing failed");
    await db
      .update(sessionsTable)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Processing failed",
      })
      .where(eq(sessionsTable.id, sessionId));
  }
}

export default router;
