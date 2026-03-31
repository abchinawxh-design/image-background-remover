/**
 * POST /api/paypal/create-subscription
 * Creates a PayPal recurring subscription
 * Body: { plan: 'pro_monthly' | 'pro_yearly' }
 * Returns: { subscriptionId, approveUrl }
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSubscription, type OrderPlan } from '@/lib/paypal';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let plan: OrderPlan;
  try {
    const body = await req.json();
    plan = body.plan;
    if (!['pro_monthly', 'pro_yearly'].includes(plan)) throw new Error('invalid plan');
  } catch {
    return NextResponse.json({ error: 'Invalid request: plan must be pro_monthly or pro_yearly' }, { status: 400 });
  }

  // Check if subscription plan IDs are configured
  const planIdKey = plan === 'pro_monthly' ? 'PAYPAL_PLAN_ID_MONTHLY' : 'PAYPAL_PLAN_ID_YEARLY';
  if (!process.env[planIdKey]) {
    return NextResponse.json(
      { error: 'Subscription plans not configured. Please run /api/paypal/setup-plans first.' },
      { status: 503 }
    );
  }

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/pricing?subscription=success&plan=${plan}`;
  const cancelUrl = `${origin}/pricing?subscription=cancelled`;

  try {
    const result = await createSubscription(plan, returnUrl, cancelUrl);
    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      approveUrl: result.approveUrl,
      status: result.status,
    });
  } catch (e: any) {
    console.error('[create-subscription] PayPal error:', e);
    return NextResponse.json({ error: 'Failed to create subscription. Please try again.' }, { status: 500 });
  }
}
