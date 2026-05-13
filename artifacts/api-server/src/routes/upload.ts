import { Router } from "express";
import multer from "multer";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  transcribeAudio,
  buildTranscriptSegments,
  generateWaveformFromWords,
  analyzeTranscriptWithAI,
  markGoldenMomentsInSegments,
} from "../lib/speechAnalysis.js";

const router = Router();

// Store files in memory (max 100MB for video/audio)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/", "video/"];
    if (allowed.some((t) => file.mimetype.startsWith(t))) {
      cb(null, true);
    } else {
      cb(new Error("Only audio and video files are accepted"));
    }
  },
});

// POST /api/sessions - create session with optional file
router.post("/sessions/upload", upload.single("media"), async (req, res): Promise<void> => {
  const log = req.log;
  const { title, speakerName } = req.body as { title?: string; speakerName?: string };

  if (!title || !speakerName) {
    res.status(400).json({ error: "title and speakerName are required" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "A media file is required" });
    return;
  }

  // Create session immediately with "processing" status
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

  // Return the session immediately, process asynchronously
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

  // Process asynchronously
  processMedia(session.id, req.file!.buffer, req.file!.mimetype, speakerName, log).catch((err) => {
    log.error({ err }, "Media processing failed");
  });
});

async function processMedia(
  sessionId: number,
  buffer: Buffer,
  mimeType: string,
  speakerName: string,
  log: import("pino").Logger
) {
  try {
    log.info({ sessionId }, "Starting transcription");

    // Step 1: Transcribe
    const { text, words, duration } = await transcribeAudio(buffer, mimeType);
    log.info({ sessionId, wordCount: words.length, duration }, "Transcription complete");

    // Step 2: Build transcript segments
    const rawSegments = buildTranscriptSegments(words);

    // Step 3: Generate waveform from word timing
    const waveform = generateWaveformFromWords(words, duration);

    // Step 4: AI analysis
    log.info({ sessionId }, "Starting AI analysis");
    const analysis = await analyzeTranscriptWithAI(text, words, duration, speakerName);
    log.info({ sessionId, overallScore: analysis.overallScore }, "AI analysis complete");

    // Step 5: Mark golden moments in transcript
    const segments = markGoldenMomentsInSegments(rawSegments, analysis);

    // Step 6: Update session with real data
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

    log.info({ sessionId }, "Session processing complete");
  } catch (err) {
    log.error({ err, sessionId }, "Processing failed");
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
