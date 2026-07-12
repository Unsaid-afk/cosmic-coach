import { Router } from "express";
import { db, sessionsTable, teamsTable, teamMembersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/enterprise/reports
// Secure endpoint to get all raw session data for a given team
// In a real application, you might use API Keys here instead of user auth, but we'll use manager auth for now.
router.get("/enterprise/reports", requireAuth, async (req, res): Promise<void> => {
  try {
    // 1. Check if user is a manager of any team
    const myMemberships = await db
      .select({
        teamId: teamMembersTable.teamId,
        role: teamMembersTable.role,
        teamName: teamsTable.name,
      })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
      .where(eq(teamMembersTable.userId, req.userId!));

    const managerTeam = myMemberships.find(m => m.role === "manager");

    if (!managerTeam) {
      res.status(403).json({ error: "Access denied. Only managers can access enterprise reports." });
      return;
    }

    // 2. Fetch all raw sessions for the team
    const rawSessions = await db
      .select({
        id: sessionsTable.id,
        speakerName: sessionsTable.speakerName,
        title: sessionsTable.title,
        duration: sessionsTable.duration,
        overallScore: sessionsTable.overallScore,
        confidenceScore: sessionsTable.confidenceScore,
        eyeContactScore: sessionsTable.eyeContactScore,
        fillerWordCount: sessionsTable.fillerWordCount,
        energyLevel: sessionsTable.energyLevel,
        createdAt: sessionsTable.createdAt,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.teamId, managerTeam.teamId))
      .orderBy(desc(sessionsTable.createdAt));

    // 3. Optional: formatting as CSV if requested
    const format = req.query.format as string;
    
    if (format === "csv") {
      if (rawSessions.length === 0) {
        res.header('Content-Type', 'text/csv');
        res.send("No data\n");
        return;
      }
      const headers = Object.keys(rawSessions[0]).join(",");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = rawSessions.map((r: any) => Object.values(r).join(","));
      const csv = [headers, ...rows].join("\n");
      res.header('Content-Type', 'text/csv');
      res.attachment(`enterprise-report-${managerTeam.teamName}.csv`);
      res.send(csv);
      return;
    }

    res.json({
      teamName: managerTeam.teamName,
      totalSessions: rawSessions.length,
      data: rawSessions,
    });
  } catch (err) {
    req.log.error(err, "Failed to generate enterprise report");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
