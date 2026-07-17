import { getStripeSync } from "./stripeClient.js";
import { logger } from "./logger.js";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "Webhook payload must be a Buffer. Ensure webhook route is registered BEFORE express.json().",
      );
    }

    // Guard: skip processing if webhook secret is not configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.startsWith("your_") || webhookSecret.length < 10) {
      logger.warn("STRIPE_WEBHOOK_SECRET is not configured — skipping webhook processing. Set a valid webhook secret to enable Stripe webhook handling.");
      return;
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
