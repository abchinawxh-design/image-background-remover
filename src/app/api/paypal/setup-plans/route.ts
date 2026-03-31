/**
 * GET /api/paypal/setup-plans
 * One-time admin endpoint: creates PayPal product + subscription plans.
 * Run once, then store returned plan IDs in env vars:
 *   PAYPAL_PLAN_ID_MONTHLY=...
 *   PAYPAL_PLAN_ID_YEARLY=...
 *
 * Protected by ADMIN_SECRET header.
 */
import { NextResponse } from 'next/server';
import { setupSubscriptionPlans } from '@/lib/paypal';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Simple admin guard
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { monthlyPlanId, yearlyPlanId } = await setupSubscriptionPlans();
    return NextResponse.json({
      success: true,
      message: 'Plans created. Add these to your environment variables:',
      env: {
        PAYPAL_PLAN_ID_MONTHLY: monthlyPlanId,
        PAYPAL_PLAN_ID_YEARLY: yearlyPlanId,
      },
    });
  } catch (e: any) {
    console.error('[setup-plans] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
