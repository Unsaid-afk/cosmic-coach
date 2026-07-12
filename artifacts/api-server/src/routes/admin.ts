import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, sessionsTable, enterpriseContractsTable } from "@workspace/db";
import { desc, sql, count, eq } from "drizzle-orm";
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
  
  let email = (auth.sessionClaims?.email as string | undefined) ?? null;
  
  if (!email) {
    // Fetch from database if not in session claims
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      email = user?.email ?? null;
    } catch (err) {
      req.log.error({ err, userId }, "Failed to fetch user email for admin check");
    }
  }

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

import { clerkClient } from "@clerk/express";

router.post("/admin/users/:id/ban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const newBanStatus = !user.isBanned;
    await db.update(usersTable).set({ isBanned: newBanStatus }).where(eq(usersTable.id, userId));
    
    // Sync ban status with Clerk so they are logged out and cannot sign in
    try {
      if (newBanStatus) {
        await clerkClient.users.banUser(userId);
      } else {
        await clerkClient.users.unbanUser(userId);
      }
    } catch (e) {
      req.log.warn({ err: e }, "Failed to sync ban status to Clerk");
    }

    res.json({ success: true, isBanned: newBanStatus });
  } catch (err) {
    req.log.error({ err }, "Toggle ban failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.id);
    // Try to delete from clerk if possible
    try {
      await clerkClient.users.deleteUser(userId);
    } catch (e) {
      req.log.warn({ err: e }, "Failed to delete user from Clerk");
    }
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete user failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.id);
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    await db.update(usersTable).set({ email }).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Edit user failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/admin/sessions/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = parseInt(String(req.params.id), 10);
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete session failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/sessions/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = parseInt(String(req.params.id), 10);
    const { title, speakerName } = req.body;
    await db.update(sessionsTable).set({ title, speakerName }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Edit session failed");
    res.status(500).json({ error: "Server error" });
  }
});

// --- Enterprise Contracts ---

router.get("/admin/contracts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const contracts = await db
      .select({
        id: enterpriseContractsTable.id,
        userId: enterpriseContractsTable.userId,
        pricePerMonth: enterpriseContractsTable.pricePerMonth,
        sessionQuota: enterpriseContractsTable.sessionQuota,
        status: enterpriseContractsTable.status,
        createdAt: enterpriseContractsTable.createdAt,
        email: usersTable.email,
      })
      .from(enterpriseContractsTable)
      .innerJoin(usersTable, eq(enterpriseContractsTable.userId, usersTable.id))
      .orderBy(desc(enterpriseContractsTable.createdAt));

    res.json(contracts);
  } catch (err) {
    req.log.error({ err }, "Get contracts failed");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/admin/contracts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, pricePerMonth, sessionQuota } = req.body;
    
    // Find user by email
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Create contract
    const [contract] = await db.insert(enterpriseContractsTable).values({
      userId: user.id,
      pricePerMonth: parseInt(pricePerMonth, 10),
      sessionQuota: parseInt(sessionQuota, 10),
      status: "active",
    }).returning();

    // Set isEnterpriseContract on user
    await db.update(usersTable).set({ isEnterpriseContract: true }).where(eq(usersTable.id, user.id));

    res.json({ success: true, contract });
  } catch (err) {
    req.log.error({ err }, "Create contract failed");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
