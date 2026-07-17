import { Router } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { isAdminEmail } from "../lib/adminUtils.js";
import type {
  AnalysisData,
  DetailedAnalysis,
  TranscriptSegment,
  WaveformPoint,
} from "../lib/speechAnalysis.js";

const router = Router();

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function fallbackWaveform(sessionId: number, duration: number): WaveformPoint[] {
  const points: WaveformPoint[] = [];
  const steps = Math.min(Math.floor(duration), 120);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration;
    const r1 = seededRandom(sessionId * 100 + i);
    const r2 = seededRandom(sessionId * 200 + i);
    const r3 = seededRandom(sessionId * 300 + i);
    const energy = 0.3 + r1 * 0.6 + Math.sin(i * 0.3) * 0.1;
    points.push({
      time: Math.round(t * 10) / 10,
      energy: Math.max(0, Math.min(1, energy)),
      clarity: Math.max(0, Math.min(1, 0.5 + r2 * 0.4)),
      pitch: 0.4 + r3 * 0.4,
    });
  }
  return points;
}

function fallbackTranscript(sessionId: number, duration: number): TranscriptSegment[] {
  const sampleWords = [
    "Today I want to talk about the future of our industry.",
    "The data shows incredible growth potential.",
    "Our solution is fast, reliable, and secure.",
    "We've been working on this for three years.",
    "The market opportunity is just enormous.",
    "Let me tell you about a customer who transformed their business.",
    "We identified a critical problem in the market.",
    "The numbers speak for themselves — 40% cost reduction.",
    "Most companies struggle with this exact issue.",
    "Our team built something truly remarkable.",
    "The competition hasn't caught up yet.",
    "This is the moment that changes everything.",
  ];
  const fillerPhrases = ["um", "uh", "like", "you know", "so", "basically", "ah"];
  const segments: TranscriptSegment[] = [];
  let currentTime = 0;
  const segCount = Math.min(sampleWords.length, Math.floor(duration / 10) + 4);

  for (let i = 0; i < segCount; i++) {
    const r = seededRandom(sessionId * 50 + i);
    const isFillerWord = r < 0.3;
    const dur = 4 + seededRandom(sessionId * 70 + i) * 8;
    const fillerIdx = Math.floor(seededRandom(sessionId * 90 + i) * fillerPhrases.length);

    segments.push({
      id: `seg-${i}`,
      startTime: Math.round(currentTime * 10) / 10,
      endTime: Math.round((currentTime + dur) * 10) / 10,
      text: isFillerWord ? fillerPhrases[fillerIdx] : sampleWords[i % sampleWords.length],
      isFillerWord,
      fillerType: isFillerWord ? ["um", "uh", "ah", "like", "you_know", "so", "basically"][fillerIdx] : undefined,
      confidenceScore: 0.6 + seededRandom(sessionId * 110 + i) * 0.35,
      isGoldenMoment: !isFillerWord && seededRandom(sessionId * 130 + i) > 0.8,
    });
    currentTime += dur;
  }
  return segments;
}

function fallbackAnalysis(sessionId: number, s: typeof sessionsTable.$inferSelect): AnalysisData {
  return {
    overallScore: s.overallScore,
    eyeContactScore: s.eyeContactScore,
    confidenceScore: s.confidenceScore,
    fillerWordCount: s.fillerWordCount,
    speechPaceWpm: Math.floor(120 + seededRandom(sessionId * 13) * 60),
    volumeConsistency: Math.floor(s.overallScore * 0.85 + seededRandom(sessionId * 19) * 15),
    structureScore: Math.floor(s.overallScore * 0.9 + seededRandom(sessionId * 23) * 10),
    energyLevel: s.energyLevel,
    goldenMomentCount: Math.floor(seededRandom(sessionId * 7) * 3) + 1,
    topStrengths: [
      "Strong vocal energy in the opening segment",
      "Clear enunciation throughout",
      "Effective use of pauses for emphasis",
    ].slice(0, 2 + Math.floor(seededRandom(sessionId * 7) * 2)),
    topImprovements: [
      `Reduce filler words — detected ${s.fillerWordCount} instances`,
      "Maintain eye contact during data-heavy slides",
      "Introduce the core problem earlier in the presentation",
    ],
    duration: s.duration,
    persuasion: {
      pasScore: Math.floor(s.overallScore * 0.8 + seededRandom(sessionId * 17) * 20),
      hasProblemStatement: s.overallScore > 55,
      hasAgitation: s.overallScore > 65,
      hasSolution: s.overallScore > 50,
      ruleOfThreeCount: Math.floor(seededRandom(sessionId * 23) * 4),
      ruleOfThreeExamples: ["Fast, Reliable, and Secure", "Identify, Analyze, and Solve"].slice(0, Math.floor(seededRandom(sessionId * 29) * 3)),
      hasStorytelling: s.overallScore > 70,
      storytellingSegments: s.overallScore > 70 ? ["Customer story at 2:15"] : [],
      persuasionAlerts: [
        { id: "alert-1", severity: "warning", message: "Supporting data presented too late — audience may disengage before proof.", timestamp: 45 },
        { id: "alert-2", severity: "info", message: "Strong opening hook detected.", timestamp: 12 },
      ],
    },
    audience: [
      { id: "persona-skeptic", name: "The Skeptic", role: "skeptic", avatarSeed: "skeptic", overallReaction: s.overallScore > 75 ? "neutral" : "skeptical", retentionScore: Math.floor(s.overallScore * 0.7), feedbackItems: [{ timestamp: 45, comment: "You claimed this would save money, but supporting data came much later.", sentiment: "negative" }, { timestamp: 180, comment: "The ROI numbers are compelling, but I need a case study.", sentiment: "neutral" }] },
      { id: "persona-exec", name: "The Busy Exec", role: "busy_exec", avatarSeed: "exec", overallReaction: s.overallScore > 80 ? "engaged" : "neutral", retentionScore: Math.floor(s.overallScore * 0.85), feedbackItems: [{ timestamp: 90, comment: "Your intro was slow. I would have tuned out by minute 2.", sentiment: "negative" }, { timestamp: 240, comment: "The business impact slide finally got my attention.", sentiment: "positive" }] },
      { id: "persona-novice", name: "The Novice", role: "novice", avatarSeed: "novice", overallReaction: s.overallScore > 65 ? "engaged" : "lost", retentionScore: Math.floor(s.overallScore * 0.9), feedbackItems: [{ timestamp: 30, comment: "Great introduction — I understood the problem immediately.", sentiment: "positive" }, { timestamp: 150, comment: "The technical terms were confusing without more context.", sentiment: "negative" }] },
    ],
    impactTimeline: Array.from({ length: Math.min(Math.floor(s.duration / 15) + 1, 60) }, (_, i) => {
      const t = i * 15;
      const base = s.overallScore * 0.7;
      const wave = Math.sin(i * 0.4) * 15;
      const impact = Math.max(10, Math.min(100, base + wave + (seededRandom(sessionId * 60 + i) - 0.5) * 20));
      return {
        time: t,
        impactScore: Math.round(impact),
        isPhoneCheckMoment: impact < 35 && seededRandom(sessionId * 80 + i) > 0.6,
        isGoldenMoment: impact > 80 && seededRandom(sessionId * 90 + i) > 0.7,
      };
    }),
  };
}

function fallbackDetailedAnalysis(sessionId: number, s: typeof sessionsTable.$inferSelect): DetailedAnalysis {
  const r = (n: number) => seededRandom(sessionId * n);
  return {
    metrics: [
      { metric: "Overall Delivery", score: s.overallScore, rating: s.overallScore >= 80 ? "excellent" : s.overallScore >= 65 ? "good" : s.overallScore >= 50 ? "fair" : "poor", reason: "The speaker demonstrates solid command of the material with clear articulation and consistent energy throughout the presentation.", tip: "Record yourself and replay at 0.75× speed to catch moments where your energy dips below baseline." },
      { metric: "Confidence & Authority", score: Math.round(s.confidenceScore), rating: s.confidenceScore >= 80 ? "excellent" : s.confidenceScore >= 65 ? "good" : "fair", reason: "Vocal projection is consistent but some hesitation patterns emerge during transitions between key points.", tip: "Practice the 'power pose' before speaking and use deliberate downward inflections at sentence ends to signal authority." },
      { metric: "Speech Structure", score: Math.round(s.overallScore * 0.9 + r(23) * 10), rating: s.overallScore >= 75 ? "good" : "fair", reason: "The speech follows a recognizable arc but the problem statement could be introduced earlier to anchor the audience's attention sooner.", tip: "Use the PREP framework: Point → Reason → Example → Point. State your core message in the first 30 seconds." },
      { metric: "Pacing & Rhythm", score: Math.round(120 + r(13) * 60), rating: "good", reason: "Speech pace sits within the 120–160 WPM ideal range. Strategic pauses are used after major claims, which gives the audience time to absorb key points.", tip: "Mark pause spots in your notes with a '//'. Aim for 2–3 second pauses after your most important statements." },
      { metric: "Vocabulary & Clarity", score: Math.round(s.overallScore * 0.85 + r(31) * 15), rating: s.overallScore >= 70 ? "good" : "fair", reason: "Language is accessible and jargon is mostly avoided. A few technical terms appear without definition, which may lose non-expert listeners.", tip: "For every technical term, prepare a 10-word plain-English definition. Test comprehension with someone outside your field." },
      { metric: "Engagement Factor", score: Math.round(s.overallScore * 0.8 + r(37) * 20), rating: s.overallScore >= 75 ? "good" : "fair", reason: "Rhetorical questions and storytelling elements keep the audience engaged in the middle section. Opening hook needs strengthening.", tip: "Open with a shocking statistic or micro-story from a real person. The first 60 seconds determine whether the audience is with you." },
    ],
    fillerBreakdown: s.fillerWordCount > 0 ? [
      { word: "um", count: Math.ceil(s.fillerWordCount * 0.4), impact: "Signals uncertainty to listeners and erodes perceived expertise — each 'um' triggers a micro-doubt in the audience." },
      { word: "uh", count: Math.ceil(s.fillerWordCount * 0.3), impact: "Creates cognitive friction for listeners who must mentally skip over the non-word while tracking your argument." },
      { word: "like", count: Math.ceil(s.fillerWordCount * 0.3), impact: "Perceived as informal in professional contexts — reduces authority with executive and expert audiences." },
    ] : [],
    pacingAnalysis: "The speaker maintains a steady cadence through the first two-thirds of the speech. Speed increases noticeably during the solution section, which may cause the audience to miss critical details. Strategic pauses are placed after rhetorical questions, which is effective. The closing 20% rushes slightly — slowing down here would increase memorability.",
    openingStrength: "The opening establishes context clearly but lacks an immediate hook to capture attention. The first 15 seconds consist of scene-setting rather than a bold claim or provocative question. Audiences form their engagement decision in the first 30 seconds — a stronger opening statement would significantly improve retention throughout.",
    closingStrength: "The closing summarizes the main points effectively and ends on a forward-looking note. However, the call to action is somewhat vague — a more specific next step with a concrete timeframe would drive audience action. The final sentence trails off in energy; rehearse the closing with full vocal commitment.",
    keyThemes: ["Innovation", "Market Opportunity", "Proof Points", "Customer Success", "Strategic Vision"],
    vocabularyComplexity: "moderate",
    callToActionPresent: s.overallScore > 60,
    callToActionStrength: s.overallScore > 60 ? "A call to action is present but could be more specific. Add a concrete next step with timeline and owner." : "No clear call to action was detected. Every speech should end with one specific thing you want the audience to do.",
    overallVerdict: `This speaker shows genuine strengths in ${s.overallScore >= 75 ? "vocal delivery and content clarity" : "content knowledge and structural intent"}, which form a strong foundation to build on. The primary area to address is reducing filler words (${s.fillerWordCount} detected) to project greater authority under pressure. Focus next practice sessions on the opening hook and a sharper call to action. With consistent drilling on these two elements, this speaker can move from good to exceptional in 4–6 weeks.`,
  };
}

async function getSessionOrFail(req: import("express").Request, res: import("express").Response) {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return null; }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Not found" }); return null; }
  // Ownership check: session must belong to the requesting user (admins bypass)
  if (session.userId && session.userId !== req.userId) {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      if (!isAdminEmail(user?.email)) {
        res.status(404).json({ error: "Not found" });
        return null;
      }
    } catch {
      res.status(404).json({ error: "Not found" });
      return null;
    }
  }
  return { id, session };
}

router.get("/sessions/:id/analysis", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const analysis = session.analysisData
      ? (session.analysisData as unknown as AnalysisData)
      : fallbackAnalysis(id, session);

    res.json({
      sessionId: String(id),
      overallScore: analysis.overallScore,
      eyeContactScore: analysis.eyeContactScore,
      confidenceScore: analysis.confidenceScore,
      fillerWordCount: analysis.fillerWordCount,
      speechPaceWpm: analysis.speechPaceWpm,
      volumeConsistency: analysis.volumeConsistency,
      structureScore: analysis.structureScore,
      goldenMomentCount: analysis.goldenMomentCount,
      topStrengths: analysis.topStrengths,
      topImprovements: analysis.topImprovements,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/waveform", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const waveform = session.waveformData
      ? (session.waveformData as unknown as WaveformPoint[])
      : fallbackWaveform(id, session.duration);

    res.json(waveform);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/transcript", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const transcript = session.transcriptData
      ? (session.transcriptData as unknown as TranscriptSegment[])
      : fallbackTranscript(id, session.duration);

    res.json(transcript);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/persuasion", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const analysis = session.analysisData
      ? (session.analysisData as unknown as AnalysisData)
      : fallbackAnalysis(id, session);

    res.json(analysis.persuasion);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/audience", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const analysis = session.analysisData
      ? (session.analysisData as unknown as AnalysisData)
      : fallbackAnalysis(id, session);

    res.json(analysis.audience);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/impact-timeline", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const analysis = session.analysisData
      ? (session.analysisData as unknown as AnalysisData)
      : fallbackAnalysis(id, session);

    res.json(analysis.impactTimeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/detailed-analysis", requireAuth, async (req, res) => {
  try {
    const result = await getSessionOrFail(req, res);
    if (!result) return;
    const { id, session } = result;

    const analysis = session.analysisData
      ? (session.analysisData as unknown as AnalysisData)
      : null;

    const detailed = analysis?.detailedBreakdown ?? fallbackDetailedAnalysis(id, session);
    res.json(detailed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
