import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSessionBody } from "@workspace/api-zod";
import { z } from "zod";

const router = Router();

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.createdAt);
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
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const body = CreateSessionBody.parse(req.body);
    const [session] = await db
      .insert(sessionsTable)
      .values({
        title: body.title,
        speakerName: body.speakerName,
        duration: body.duration,
        status: "ready",
        overallScore: Math.floor(Math.random() * 30) + 60,
        energyLevel: ["low", "medium", "high", "electric"][Math.floor(Math.random() * 4)] as "low" | "medium" | "high" | "electric",
        eyeContactScore: Math.floor(Math.random() * 30) + 60,
        confidenceScore: Math.floor(Math.random() * 30) + 60,
        fillerWordCount: Math.floor(Math.random() * 20) + 2,
      })
      .returning();
    res.status(201).json({
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
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(404).json({ error: "Not found" });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Not found" });
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
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
