/**
 * paypal.ts — PayPal REST API client
 * Supports: one-time orders + recurring subscriptions
 * Environment: Sandbox (PAYPAL_ENV=sandbox) or Live (PAYPAL_ENV=live)
 */

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

// ─── Access Token (in-process cache) ────────────────────────────────────────
let _accessToken: string | null = null;
let _tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_accessToken && now < _tokenExpiresAt) return _accessToken;

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[paypal] token fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _accessToken = data.access_token;
  _tokenExpiresAt = now + (data.expires_in - 60) * 1000; // 60s buffer
  return _accessToken;
}

async function paypalRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* empty */ }

  if (!res.ok) {
    const msg = json?.message ?? json?.error_description ?? text;
    throw new Error(`[paypal] ${method} ${path} → ${res.status}: ${msg}`);
  }

  return (json ?? {}) as T;
}

// ─── One-time Order ──────────────────────────────────────────────────────────

export type OrderPlan = 'pro_monthly' | 'pro_yearly';

const ORDER_AMOUNTS: Record<OrderPlan, { value: string; description: string }> = {
  pro_monthly: { value: '4.99', description: 'Image Background Remover — Pro Monthly' },
  pro_yearly:  { value: '39.99', description: 'Image Background Remover — Pro Yearly' },
};

export interface CreateOrderResult {
  orderId: string;
  approveUrl?: string;
}

export async function createOrder(
  plan: OrderPlan,
  returnUrl: string,
  cancelUrl: string,
): Promise<CreateOrderResult> {
  const amount = ORDER_AMOUNTS[plan];
  const data = await paypalRequest<any>('POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: amount.description,
        custom_id: plan,
        amount: {
          currency_code: 'USD',
          value: amount.value,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
          brand_name: 'Image Background Remover',
          locale: 'en-US',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  });

  const approveLink = data.links?.find((l: any) => l.rel === 'payer-action')?.href;
  return { orderId: data.id, approveUrl: approveLink };
}

export interface CaptureResult {
  orderId: string;
  status: string;
  payerId?: string;
  payerEmail?: string;
  amount?: string;
  currency?: string;
  captureId?: string;
  customId?: string;   // plan name we stored
}

export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const data = await paypalRequest<any>('POST', `/v2/checkout/orders/${orderId}/capture`, {});

  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  return {
    orderId: data.id,
    status: data.status,
    payerId: data.payer?.payer_id,
    payerEmail: data.payer?.email_address,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    captureId: capture?.id,
    customId: unit?.custom_id,
  };
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

// Plan IDs must be created once in PayPal and stored as env vars.
// Use /api/paypal/setup-plans to generate them the first time.
export function getSubscriptionPlanId(plan: OrderPlan): string {
  const key = plan === 'pro_monthly'
    ? process.env.PAYPAL_PLAN_ID_MONTHLY
    : process.env.PAYPAL_PLAN_ID_YEARLY;
  if (!key) throw new Error(`[paypal] Missing env var for plan: ${plan}`);
  return key;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  approveUrl: string;
  status: string;
}

export async function createSubscription(
  plan: OrderPlan,
  returnUrl: string,
  cancelUrl: string,
): Promise<CreateSubscriptionResult> {
  const planId = getSubscriptionPlanId(plan);
  const data = await paypalRequest<any>('POST', '/v1/billing/subscriptions', {
    plan_id: planId,
    application_context: {
      brand_name: 'Image Background Remover',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      payment_method: {
        payer_selected: 'PAYPAL',
        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
      },
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  });

  const approveLink = data.links?.find((l: any) => l.rel === 'approve')?.href;
  if (!approveLink) throw new Error('[paypal] No approve link in subscription response');

  return {
    subscriptionId: data.id,
    approveUrl: approveLink,
    status: data.status,
  };
}

export async function getSubscription(subscriptionId: string): Promise<any> {
  return paypalRequest<any>('GET', `/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await paypalRequest<any>('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, { reason });
}

// ─── Subscription Plan Setup ─────────────────────────────────────────────────

export async function setupSubscriptionPlans(): Promise<{
  monthlyPlanId: string;
  yearlyPlanId: string;
}> {
  // 1. Create product
  const product = await paypalRequest<any>('POST', '/v1/catalogs/products', {
    name: 'Image Background Remover Pro',
    description: 'AI-powered background removal tool — Pro subscription',
    type: 'SERVICE',
    category: 'SOFTWARE',
  });
  const productId = product.id;

  // 2. Monthly plan
  const monthly = await paypalRequest<any>('POST', '/v1/billing/plans', {
    product_id: productId,
    name: 'Pro Monthly',
    description: '100 background removals per month',
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,  // infinite
        pricing_scheme: { fixed_price: { value: '4.99', currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0', currency_code: 'USD' },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  });

  // 3. Yearly plan
  const yearly = await paypalRequest<any>('POST', '/v1/billing/plans', {
    product_id: productId,
    name: 'Pro Yearly',
    description: '100 background removals per month — annual billing',
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '39.99', currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0', currency_code: 'USD' },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  });

  return { monthlyPlanId: monthly.id, yearlyPlanId: yearly.id };
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

export async function verifyWebhookSignature(params: {
  webhookId: string;
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  try {
    const result = await paypalRequest<any>(
      'POST',
      '/v1/notifications/verify-webhook-signature',
      {
        webhook_id: params.webhookId,
        transmission_id: params.transmissionId,
        transmission_time: params.transmissionTime,
        cert_url: params.certUrl,
        auth_algo: params.authAlgo,
        transmission_sig: params.transmissionSig,
        webhook_event: params.webhookEvent,
      },
    );
    return result.verification_status === 'SUCCESS';
  } catch (e) {
    console.error('[paypal] webhook verification failed:', e);
    return false;
  }
}
