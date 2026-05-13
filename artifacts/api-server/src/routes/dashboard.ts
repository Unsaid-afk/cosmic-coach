import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  try {
    const all = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt));

    if (all.length === 0) {
      res.json({
        totalSessions: 0,
        averageScore: 0,
        totalFillerWordsEliminated: 0,
        mostImprovedMetric: "Eye Contact",
        bestSession: null,
        recentSessions: [],
        scoreProgression: [],
      });
      return;
    }

    const totalSessions = all.length;
    const averageScore = Math.round(all.reduce((sum, s) => sum + s.overallScore, 0) / totalSessions);
    const totalFillerWordsEliminated = all.reduce((sum, s) => sum + s.fillerWordCount, 0);
    const bestSession = [...all].sort((a, b) => b.overallScore - a.overallScore)[0];

    const mapSession = (s: typeof all[0]) => ({
      id: String(s.id),
      title: s.title,
      speakerName: s.speakerName,
      duration: s.duration,
      createdAt: s.createdAt.toISOString(),
      status: s.status,
      overallScore: s.overallScore,
      energyLevel: s.energyLevel,
      eyeContactScore: s.eyeContactScore,
      confidenceScore: s.confidenceScore,
      fillerWordCount: s.fillerWordCount,
    });

    const scoreProgression = [...all]
      .reverse()
      .map((s, i) => ({
        date: s.createdAt.toISOString().split("T")[0],
        score: s.overallScore,
      }));

    res.json({
      totalSessions,
      averageScore,
      totalFillerWordsEliminated,
      mostImprovedMetric: "Confidence Score",
      bestSession: mapSession(bestSession),
      recentSessions: all.slice(0, 5).map(mapSession),
      scoreProgression,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
