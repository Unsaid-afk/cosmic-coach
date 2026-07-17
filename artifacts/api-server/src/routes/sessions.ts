import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.userId, req.userId!))
      .orderBy(desc(sessionsTable.createdAt));
    const mapped = sessions.map((s) => ({
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
      errorMessage: s.errorMessage,
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.get("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, req.userId!)));
    if (!session) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
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
      errorMessage: session.errorMessage,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

