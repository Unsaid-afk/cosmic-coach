import { db, sessionsTable, usersTable, enterpriseContractsTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { isAdminEmail } from "./adminUtils.js";

async function isPremiumUser(stripeSubscriptionId: string | null | undefined): Promise<boolean> {
  if (!stripeSubscriptionId) return false;
  try {
    const result = await db.execute(
      sql`SELECT status FROM stripe.subscriptions WHERE id = ${stripeSubscriptionId} AND status IN ('active', 'trialing') LIMIT 1`,
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function getUserQuota(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const isPremium = await isPremiumUser(user?.stripeSubscriptionId);
  const isAdmin = isAdminEmail(user?.email);

  if (isAdmin) return { limit: Infinity, used: 0, isPremium: true };

  let limit = isPremium ? 80 : 10;
  let isEnterprise = false;

  // Check custom enterprise contract
  if (user?.isEnterpriseContract) {
    const [contract] = await db
      .select()
      .from(enterpriseContractsTable)
      .where(and(eq(enterpriseContractsTable.userId, userId), eq(enterpriseContractsTable.status, "active")));
    
    if (contract) {
      limit = contract.sessionQuota;
      isEnterprise = true;
    }
  }

  // Calculate used sessions based on the 45-minute rule for this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sessions = await db
    .select({ duration: sessionsTable.duration })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        gte(sessionsTable.createdAt, startOfMonth)
      )
    );

  // Each session consumes Math.ceil(durationInSeconds / (45 * 60)) quotas. If 0, it consumes 1.
  let used = 0;
  for (const s of sessions) {
    const durationMins = (s.duration || 0) / 60;
    const quotaConsumed = durationMins <= 0 ? 1 : Math.ceil(durationMins / 45);
    used += quotaConsumed;
  }

  return { limit, used, isPremium: isPremium || isEnterprise };
}
