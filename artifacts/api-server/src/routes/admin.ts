import { Router, type Request, type Response } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { desc, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { isAdminEmail } from "../lib/adminUtils.js";
import { getAuth } from "@clerk/express";

const router = Router();

async function requireAdmin(req: Request, res: Response, next: import("express").NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const email = (auth.sessionClaims?.email as string | undefined) ?? null;
  if (!isAdminEmail(email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.userId = userId;
  next();
}

router.get("/admin/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(usersTable);
    const [{ totalSessions }] = await db.select({ totalSessions: count() }).from(sessionsTable);

    let premiumCount = 0;
    try {
      const premResult = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM stripe.subscriptions WHERE status IN ('active', 'trialing')`,
      );
      premiumCount = Number((premResult.rows[0] as { cnt: string })?.cnt ?? 0);
    } catch {
      premiumCount = 0;
    }

    res.json({
      totalUsers,
      totalSessions,
      premiumCount,
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Admin users failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/sessions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await db
      .select()
      .from(sessionsTable)
      .orderBy(desc(sessionsTable.createdAt));

    const mapped = sessions.map((s) => ({
      id: String(s.id),
      userId: s.userId,
      title: s.title,
      speakerName: s.speakerName,
      duration: s.duration,
      createdAt: s.createdAt.toISOString(),
      status: s.status,
      overallScore: s.overallScore,
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Admin sessions failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
