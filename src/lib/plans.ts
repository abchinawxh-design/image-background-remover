/**
 * plans.ts — 套餐定义与用量控制逻辑
 */

export type Plan = 'free' | 'pro';

export interface PlanConfig {
  id: Plan;
  name: string;
  monthlyLimit: number | null;  // null = use credits_total
  price: { monthly: number; yearly: number } | null;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyLimit: null,  // free uses credits_total instead
    price: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyLimit: 100,
    price: { monthly: 4.99, yearly: 39.99 },
  },
};

export interface QuotaStatus {
  allowed: boolean;
  reason?: 'not_logged_in' | 'no_credits' | 'monthly_limit_reached' | 'plan_expired';
  plan: Plan;
  creditsRemaining?: number;   // free plan
  monthlyUsed?: number;        // pro plan
  monthlyLimit?: number;       // pro plan
}

export interface UserPlanData {
  id: string;
  plan: Plan;
  plan_expires_at: number | null;
  credits_total: number;
  credits_used: number;
}

/**
 * Check if a user is allowed to make a removal request.
 * Does NOT mutate anything — caller handles the write.
 */
export function checkQuota(
  user: UserPlanData,
  monthlyUsed: number,
): QuotaStatus {
  const now = Date.now();

  // Check plan expiry
  if (user.plan === 'pro' && user.plan_expires_at && user.plan_expires_at < now) {
    // Plan expired — treat as free for this check
    // (actual downgrade happens in a separate cron/webhook)
    return checkQuota({ ...user, plan: 'free' }, monthlyUsed);
  }

  if (user.plan === 'pro') {
    const limit = PLANS.pro.monthlyLimit!;
    if (monthlyUsed >= limit) {
      return {
        allowed: false,
        reason: 'monthly_limit_reached',
        plan: 'pro',
        monthlyUsed,
        monthlyLimit: limit,
      };
    }
    return { allowed: true, plan: 'pro', monthlyUsed, monthlyLimit: limit };
  }

  // Free plan — credit-based
  const remaining = user.credits_total - user.credits_used;
  if (remaining <= 0) {
    return { allowed: false, reason: 'no_credits', plan: 'free', creditsRemaining: 0 };
  }
  return { allowed: true, plan: 'free', creditsRemaining: remaining };
}
