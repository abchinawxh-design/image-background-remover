/**
 * POST /api/paypal/webhook
 * Handles PayPal webhook events:
 * - PAYMENT.CAPTURE.COMPLETED       — one-time payment success
 * - PAYMENT.CAPTURE.REFUNDED        — refund issued
 * - BILLING.SUBSCRIPTION.ACTIVATED  — subscription active
 * - BILLING.SUBSCRIPTION.CANCELLED  — user cancelled
 * - BILLING.SUBSCRIPTION.SUSPENDED  — payment failed 3x
 * - BILLING.SUBSCRIPTION.PAYMENT.FAILED
 * - CUSTOMER.DISPUTE.CREATED        — chargeback/dispute
 */
import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paypal';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'nodejs';

// Disable body parsing — we need raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Get D1 binding
  let db: any = null;
  try {
    const { env } = await getCloudflareContext();
    db = (env as any).DB ?? null;
  } catch { /* local dev */ }

  let payload: any;
  let rawBody: string;
  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify webhook signature (skip in dev if PAYPAL_WEBHOOK_ID not set)
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    const transmissionId = req.headers.get('paypal-transmission-id') ?? '';
    const transmissionTime = req.headers.get('paypal-transmission-time') ?? '';
    const certUrl = req.headers.get('paypal-cert-url') ?? '';
    const authAlgo = req.headers.get('paypal-auth-algo') ?? '';
    const transmissionSig = req.headers.get('paypal-transmission-sig') ?? '';

    const isValid = await verifyWebhookSignature({
      webhookId,
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookEvent: payload,
    });

    if (!isValid) {
      console.error('[webhook] Invalid PayPal signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification');
  }

  const eventType: string = payload.event_type ?? '';
  const eventId: string = payload.id ?? crypto.randomUUID();
  const resourceId: string =
    payload.resource?.id ??
    payload.resource?.billing_agreement_id ??
    '';

  // Log event to DB
  if (db) {
    try {
      await db.prepare(
        `INSERT OR IGNORE INTO paypal_webhook_events
           (id, event_type, resource_id, payload, processed, created_at)
         VALUES (?1, ?2, ?3, ?4, FALSE, ?5)`
      ).bind(eventId, eventType, resourceId, rawBody, Date.now()).run();
    } catch (e) {
      console.error('[webhook] Failed to log event:', e);
    }
  }

  // Process event
  let handled = false;
  try {
    handled = await processEvent(db, eventType, payload);
  } catch (e) {
    console.error(`[webhook] processEvent failed for ${eventType}:`, e);
    if (db) {
      await db.prepare(
        `UPDATE paypal_webhook_events SET error_message = ?2 WHERE id = ?1`
      ).bind(eventId, String(e)).run().catch(() => {});
    }
  }

  // Mark processed
  if (db && handled) {
    await db.prepare(
      `UPDATE paypal_webhook_events SET processed = TRUE, processed_at = ?2 WHERE id = ?1`
    ).bind(eventId, Date.now()).run().catch(() => {});
  }

  // Always return 200 — PayPal retries on non-2xx
  return NextResponse.json({ received: true, event: eventType });
}

async function processEvent(db: any, eventType: string, payload: any): Promise<boolean> {
  const resource = payload.resource ?? {};

  switch (eventType) {
    // ── One-time: payment captured ──────────────────────────────────────────
    case 'PAYMENT.CAPTURE.COMPLETED': {
      // Handled synchronously in capture-order route.
      // Webhook is a fallback for cases where the frontend didn't complete.
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (!orderId || !db) return true;

      // Check if already processed
      const existing = await db.prepare(
        `SELECT id FROM subscriptions WHERE paypal_order_id = ?1 AND status = 'active'`
      ).bind(orderId).first();

      if (existing) {
        console.log(`[webhook] Order ${orderId} already processed, skipping`);
        return true;
      }

      // Find pending subscription record and activate it
      await db.prepare(
        `UPDATE subscriptions SET status = 'active', updated_at = ?2 WHERE paypal_order_id = ?1`
      ).bind(orderId, Date.now()).run();

      return true;
    }

    // ── One-time: refund ────────────────────────────────────────────────────
    case 'PAYMENT.CAPTURE.REFUNDED': {
      const captureId = resource.id;
      if (!captureId || !db) return true;

      // Find and expire the subscription associated with this capture
      await db.prepare(
        `UPDATE subscriptions SET status = 'expired', updated_at = ?2
         WHERE paypal_order_id IN (
           SELECT paypal_order_id FROM subscriptions WHERE paypal_order_id = ?1
         )`
      ).bind(captureId, Date.now()).run();

      // Downgrade user if no other active subscriptions
      console.log(`[webhook] Refund for capture ${captureId} — subscription expired`);
      return true;
    }

    // ── Subscription: activated ─────────────────────────────────────────────
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const subscriptionId = resource.id;
      const planId = resource.plan_id;
      if (!subscriptionId || !db) return true;

      const plan = planId === process.env.PAYPAL_PLAN_ID_YEARLY ? 'pro_yearly' : 'pro_monthly';
      const now = Date.now();
      const durationMs = plan === 'pro_yearly'
        ? 365 * 24 * 60 * 60 * 1000
        : 31 * 24 * 60 * 60 * 1000;
      const expiresAt = now + durationMs;

      // Find user by subscription ID
      const subRow = await db.prepare(
        `SELECT user_id FROM subscriptions WHERE paypal_subscription_id = ?1`
      ).bind(subscriptionId).first() as { user_id: string } | null;

      if (subRow) {
        // Update existing record
        await db.prepare(
          `UPDATE subscriptions SET status = 'active', expires_at = ?2, updated_at = ?3
           WHERE paypal_subscription_id = ?1`
        ).bind(subscriptionId, expiresAt, now).run();

        await db.prepare(
          `UPDATE users SET plan = 'pro', plan_expires_at = ?2, updated_at = ?3 WHERE id = ?1`
        ).bind(subRow.user_id, expiresAt, now).run();
      }

      return true;
    }

    // ── Subscription: cancelled ─────────────────────────────────────────────
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const subscriptionId = resource.id;
      if (!subscriptionId || !db) return true;

      const subRow = await db.prepare(
        `SELECT user_id, expires_at FROM subscriptions WHERE paypal_subscription_id = ?1`
      ).bind(subscriptionId).first() as { user_id: string; expires_at: number } | null;

      if (subRow) {
        const now = Date.now();
        await db.prepare(
          `UPDATE subscriptions SET status = 'cancelled', updated_at = ?2
           WHERE paypal_subscription_id = ?1`
        ).bind(subscriptionId, now).run();

        // Keep pro access until expires_at; a cron job or next login will downgrade
        console.log(
          `[webhook] Subscription ${subscriptionId} cancelled, access until ${new Date(subRow.expires_at).toISOString()}`
        );
      }
      return true;
    }

    // ── Subscription: suspended (payment failed 3x) ─────────────────────────
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      const subscriptionId = resource.id;
      if (!subscriptionId || !db) return true;

      const subRow = await db.prepare(
        `SELECT user_id FROM subscriptions WHERE paypal_subscription_id = ?1`
      ).bind(subscriptionId).first() as { user_id: string } | null;

      if (subRow) {
        const now = Date.now();
        await db.prepare(
          `UPDATE subscriptions SET status = 'suspended', updated_at = ?2
           WHERE paypal_subscription_id = ?1`
        ).bind(subscriptionId, now).run();

        // Immediately downgrade user
        await db.prepare(
          `UPDATE users SET plan = 'free', plan_expires_at = NULL, updated_at = ?2 WHERE id = ?1`
        ).bind(subRow.user_id, now).run();
      }
      return true;
    }

    // ── Subscription: payment failed ────────────────────────────────────────
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      const subscriptionId = resource.id;
      console.warn(`[webhook] Subscription payment failed: ${subscriptionId}`);
      // PayPal will retry; SUSPENDED event fires after max retries
      return true;
    }

    // ── Dispute created ─────────────────────────────────────────────────────
    case 'CUSTOMER.DISPUTE.CREATED': {
      const disputeId = resource.dispute_id;
      const orderId = resource.disputed_transactions?.[0]?.seller_transaction_id;
      console.warn(`[webhook] Dispute created: ${disputeId} for order/transaction ${orderId}`);
      // Suspend access during dispute
      if (orderId && db) {
        await db.prepare(
          `UPDATE subscriptions SET status = 'suspended', updated_at = ?2
           WHERE paypal_order_id = ?1`
        ).bind(orderId, Date.now()).run();
      }
      return true;
    }

    default:
      console.log(`[webhook] Unhandled event type: ${eventType}`);
      return false;
  }
}
