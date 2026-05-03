import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateWaveform(sessionId: number, duration: number) {
  const points = [];
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

function generateTranscript(sessionId: number, duration: number) {
  const sampleWords = [
    "Today I want to talk about the future of our industry.",
    "Um, the data shows incredible growth potential.",
    "Our solution is fast, reliable, and secure.",
    "Uh, we've been working on this for three years.",
    "Like, the market opportunity is just enormous.",
    "Let me tell you about a customer who transformed their business.",
    "So we identified a critical problem in the market.",
    "The numbers speak for themselves — 40% cost reduction.",
    "You know, most companies struggle with this exact issue.",
    "Our team built something truly remarkable.",
    "Basically, the competition hasn't caught up yet.",
    "This is the moment that changes everything.",
  ];

  const fillerPhrases = ["um", "uh", "like", "you know", "so", "basically", "ah"];
  const segments = [];
  let currentTime = 0;
  const segCount = Math.min(sampleWords.length, Math.floor(duration / 10) + 4);

  for (let i = 0; i < segCount; i++) {
    const r = seededRandom(sessionId * 50 + i);
    const isFillerWord = r < 0.3;
    const duration_seg = 4 + seededRandom(sessionId * 70 + i) * 8;
    const fillerIdx = Math.floor(seededRandom(sessionId * 90 + i) * fillerPhrases.length);

    segments.push({
      id: `seg-${i}`,
      startTime: Math.round(currentTime * 10) / 10,
      endTime: Math.round((currentTime + duration_seg) * 10) / 10,
      text: isFillerWord ? fillerPhrases[fillerIdx] : sampleWords[i % sampleWords.length],
      isFillerWord,
      fillerType: isFillerWord ? ["um", "uh", "ah", "like", "you_know", "so", "basically"][fillerIdx] : undefined,
      confidenceScore: 0.6 + seededRandom(sessionId * 110 + i) * 0.35,
      isGoldenMoment: !isFillerWord && seededRandom(sessionId * 130 + i) > 0.8,
    });
    currentTime += duration_seg;
  }
  return segments;
}

function generatePersuasion(sessionId: number, overallScore: number) {
  const r = seededRandom(sessionId * 17);
  const pasScore = Math.floor(overallScore * 0.8 + r * 20);
  return {
    pasScore,
    hasProblemStatement: overallScore > 55,
    hasAgitation: overallScore > 65,
    hasSolution: overallScore > 50,
    ruleOfThreeCount: Math.floor(seededRandom(sessionId * 23) * 4),
    ruleOfThreeExamples: [
      "Fast, Reliable, and Secure",
      "Identify, Analyze, and Solve",
    ].slice(0, Math.floor(seededRandom(sessionId * 29) * 3)),
    hasStorytelling: overallScore > 70,
    storytellingSegments: overallScore > 70 ? ["Customer story at 2:15"] : [],
    persuasionAlerts: [
      {
        id: "alert-1",
        severity: "warning" as const,
        message: "Supporting data presented too late — audience may disengage before proof.",
        timestamp: 45,
      },
      {
        id: "alert-2",
        severity: pasScore < 60 ? "critical" as const : "info" as const,
        message: pasScore < 60
          ? "No clear problem statement detected in the opening 60 seconds."
          : "Strong opening hook detected — audience attention captured early.",
        timestamp: 12,
      },
      {
        id: "alert-3",
        severity: "info" as const,
        message: "Rule of Three detected at 3:42 — highly memorable framing.",
        timestamp: 222,
      },
    ],
  };
}

function generateAudience(sessionId: number, overallScore: number) {
  return [
    {
      id: "persona-skeptic",
      name: "The Skeptic",
      role: "skeptic" as const,
      avatarSeed: `skeptic-${sessionId}`,
      overallReaction: overallScore > 75 ? "neutral" as const : "skeptical" as const,
      retentionScore: Math.floor(overallScore * 0.7 + seededRandom(sessionId * 31) * 20),
      feedbackItems: [
        {
          timestamp: 45,
          comment: "You claimed this would save money, but the supporting data came 12 minutes later.",
          sentiment: "negative" as const,
        },
        {
          timestamp: 180,
          comment: "The ROI numbers are compelling, but I need a case study.",
          sentiment: "neutral" as const,
        },
      ],
    },
    {
      id: "persona-exec",
      name: "The Busy Exec",
      role: "busy_exec" as const,
      avatarSeed: `exec-${sessionId}`,
      overallReaction: overallScore > 80 ? "engaged" as const : "neutral" as const,
      retentionScore: Math.floor(overallScore * 0.85 + seededRandom(sessionId * 37) * 15),
      feedbackItems: [
        {
          timestamp: 90,
          comment: "Your intro was slow. I would have tuned out by minute 2.",
          sentiment: "negative" as const,
        },
        {
          timestamp: 240,
          comment: "The business impact slide finally got my attention.",
          sentiment: "positive" as const,
        },
      ],
    },
    {
      id: "persona-novice",
      name: "The Novice",
      role: "novice" as const,
      avatarSeed: `novice-${sessionId}`,
      overallReaction: overallScore > 65 ? "engaged" as const : "lost" as const,
      retentionScore: Math.floor(overallScore * 0.9 + seededRandom(sessionId * 41) * 10),
      feedbackItems: [
        {
          timestamp: 30,
          comment: "Great introduction — I understood the problem immediately.",
          sentiment: "positive" as const,
        },
        {
          timestamp: 150,
          comment: "The technical terms were confusing without more context.",
          sentiment: "negative" as const,
        },
      ],
    },
  ];
}

function generateImpactTimeline(sessionId: number, duration: number, overallScore: number) {
  const points = [];
  const steps = Math.min(Math.floor(duration), 60);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration;
    const r = seededRandom(sessionId * 60 + i);
    const base = overallScore * 0.7;
    const wave = Math.sin(i * 0.4) * 15;
    const impact = Math.max(10, Math.min(100, base + wave + (r - 0.5) * 20));
    const isPhone = impact < 35 && seededRandom(sessionId * 80 + i) > 0.6;
    const isGolden = impact > 80 && seededRandom(sessionId * 90 + i) > 0.7;
    points.push({
      time: Math.round(t * 10) / 10,
      impactScore: Math.round(impact),
      isPhoneCheckMoment: isPhone,
      isGoldenMoment: isGolden,
      label: isGolden ? "Golden moment" : isPhone ? "Audience disengagement risk" : undefined,
    });
  }
  return points;
}

router.get("/sessions/:id/analysis", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });

    const transcript = generateTranscript(id, session.duration);
    const goldenCount = transcript.filter((s) => s.isGoldenMoment).length;

    res.json({
      sessionId: String(id),
      overallScore: session.overallScore,
      eyeContactScore: session.eyeContactScore,
      confidenceScore: session.confidenceScore,
      fillerWordCount: session.fillerWordCount,
      speechPaceWpm: Math.floor(120 + seededRandom(id * 13) * 60),
      volumeConsistency: Math.floor(session.overallScore * 0.85 + seededRandom(id * 19) * 15),
      structureScore: Math.floor(session.overallScore * 0.9 + seededRandom(id * 23) * 10),
      goldenMomentCount: goldenCount,
      topStrengths: [
        "Strong vocal energy in the opening segment",
        "Clear enunciation throughout",
        "Effective use of pauses for emphasis",
      ].slice(0, 2 + Math.floor(seededRandom(id * 7) * 2)),
      topImprovements: [
        "Reduce filler words — detected " + session.fillerWordCount + " instances",
        "Maintain eye contact during data-heavy slides",
        "Introduce the core problem earlier in the presentation",
      ],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/waveform", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(generateWaveform(id, session.duration));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/transcript", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(generateTranscript(id, session.duration));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/persuasion", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(generatePersuasion(id, session.overallScore));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/audience", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(generateAudience(id, session.overallScore));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/impact-timeline", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(generateImpactTimeline(id, session.duration, session.overallScore));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
