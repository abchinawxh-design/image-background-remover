/**
 * POST /api/paypal/capture-order
 * Captures a PayPal order after user approves in popup
 * Body: { orderId, plan }
 * On success: upgrades user plan in D1
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { captureOrder, type OrderPlan } from '@/lib/paypal';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  let orderId: string;
  let plan: OrderPlan;
  try {
    const body = await req.json();
    orderId = body.orderId;
    plan = body.plan;
    if (!orderId || !['pro_monthly', 'pro_yearly'].includes(plan)) throw new Error('invalid');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Get D1 binding
  let db: any = null;
  try {
    const { env } = await getCloudflareContext();
    db = (env as any).DB ?? null;
  } catch {
    // Local dev: db stays null, plan upgrade skipped (test mode)
  }

  // Capture payment with PayPal
  let capture;
  try {
    capture = await captureOrder(orderId);
  } catch (e: any) {
    console.error('[capture-order] PayPal capture failed:', e);
    return NextResponse.json({ error: 'Payment capture failed. Please contact support.' }, { status: 502 });
  }

  if (capture.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: `Payment not completed. Status: ${capture.status}` },
      { status: 402 },
    );
  }

  // Upgrade user plan in D1
  if (db) {
    const now = Date.now();
    const durationMs = plan === 'pro_yearly'
      ? 365 * 24 * 60 * 60 * 1000
      : 31 * 24 * 60 * 60 * 1000;
    const expiresAt = now + durationMs;
    const amount = parseFloat(capture.amount ?? '0');

    try {
      // Update user plan
      await db.prepare(
        `UPDATE users SET plan = 'pro', plan_expires_at = ?2, updated_at = ?3 WHERE id = ?1`
      ).bind(userId, expiresAt, now).run();

      // Insert subscription record
      const subId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO subscriptions
           (id, user_id, plan, type, status, started_at, expires_at, payment_ref,
            paypal_order_id, amount, currency, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'one_time', 'active', ?4, ?5, ?6, ?6, ?7, 'USD', ?4, ?4)`
      ).bind(subId, userId, plan, now, expiresAt, orderId, amount).run();
    } catch (e) {
      // Payment captured but DB write failed — log and alert (do not fail the response)
      console.error('[capture-order] D1 write failed after successful capture:', e);
    }
  }

  return NextResponse.json({
    success: true,
    plan,
    orderId: capture.orderId,
    captureId: capture.captureId,
    amount: capture.amount,
    currency: capture.currency,
  });
}
