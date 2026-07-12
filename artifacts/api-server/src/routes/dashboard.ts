import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const all = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, req.userId!)).orderBy(desc(sessionsTable.createdAt));

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
    
    // totalFillerWordsEliminated: sum of positive deltas in filler word counts between consecutive chronological sessions
    let totalFillerWordsEliminated = 0;
    const chronAll = [...all].reverse(); // oldest to newest
    for (let i = 1; i < chronAll.length; i++) {
      const diff = chronAll[i - 1].fillerWordCount - chronAll[i].fillerWordCount;
      if (diff > 0) totalFillerWordsEliminated += diff;
    }

    // mostImprovedMetric: compare oldest and newest session scores
    let mostImprovedMetric = "Overall Score";
    if (chronAll.length > 1) {
      const oldest = chronAll[0];
      const newest = chronAll[chronAll.length - 1];
      const metrics = [
        { name: "Confidence Score", diff: newest.confidenceScore - oldest.confidenceScore },
        { name: "Eye Contact", diff: newest.eyeContactScore - oldest.eyeContactScore },
        { name: "Overall Score", diff: newest.overallScore - oldest.overallScore },
      ];
      metrics.sort((a, b) => b.diff - a.diff);
      if (metrics[0].diff > 0) {
        mostImprovedMetric = metrics[0].name;
      }
    }

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

    const scoreProgression = chronAll.map((s, i) => ({
      date: s.createdAt.toISOString().split("T")[0],
      score: s.overallScore,
    }));

    res.json({
      totalSessions,
      averageScore,
      totalFillerWordsEliminated,
      mostImprovedMetric,
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
