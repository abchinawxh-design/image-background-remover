/**
 * POST /api/paypal/create-order
 * Creates a PayPal one-time order for pro_monthly or pro_yearly
 * Returns: { orderId } — frontend passes to PayPal SDK
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createOrder, type OrderPlan } from '@/lib/paypal';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Auth check
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

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/pricing?payment=success&plan=${plan}`;
  const cancelUrl = `${origin}/pricing?payment=cancelled`;

  try {
    const { orderId } = await createOrder(plan, returnUrl, cancelUrl);
    return NextResponse.json({ orderId });
  } catch (e: any) {
    console.error('[create-order] PayPal error:', e);
    return NextResponse.json({ error: 'Failed to create PayPal order. Please try again.' }, { status: 500 });
  }
}
