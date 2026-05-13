import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";
import { isAdminEmail } from "../lib/adminUtils.js";

const router = Router();

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

router.get("/users/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const log = req.log;
  const userId = req.userId!;
  const auth = getAuth(req);

  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    if (!user) {
      const email = (auth.sessionClaims?.email as string | undefined) ?? "";
      const inserted = await db
        .insert(usersTable)
        .values({ id: userId, email })
        .onConflictDoNothing()
        .returning();
      user = inserted[0];
      if (!user) {
        const [found] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        user = found;
      }
    }

    const isPremium = await isPremiumUser(user?.stripeSubscriptionId);
    const isAdmin = isAdminEmail(user?.email ?? (auth.sessionClaims?.email as string | undefined));
    res.json({ ...user, isPremium: isPremium || isAdmin, isAdmin });
  } catch (err) {
    log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/billing/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const log = req.log;
  const userId = req.userId!;
  const { priceId } = req.body as { priceId?: string };

  if (!priceId) {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const stripe = await getUncachableStripeClient();

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const auth = getAuth(req);
      const email = (auth.sessionClaims?.email as string | undefined) ?? undefined;
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await db
        .insert(usersTable)
        .values({ id: userId, email: email ?? null, stripeCustomerId: customerId })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: { stripeCustomerId: customerId },
        });
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: { trial_period_days: 7 },
      success_url: `${baseUrl}/dashboard?upgraded=1`,
      cancel_url: `${baseUrl}/pricing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    log.error({ err }, "Checkout failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/billing/portal", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const log = req.log;
  const userId = req.userId!;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    log.error({ err }, "Portal session failed");
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

router.get("/billing/products", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id as product_id, p.name as product_name, p.description as product_description,
        pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring, pr.metadata as price_metadata
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC
    `);
    res.json({ data: result.rows });
  } catch {
    res.json({ data: [] });
  }
});

export default router;
