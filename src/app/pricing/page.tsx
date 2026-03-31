'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import PayPalButtons from '@/components/PayPalButtons';
import PayPalSubscribeButton from '@/components/PayPalSubscribeButton';

const features = {
  free: [
    '3 background removals (one-time)',
    'PNG download',
    'All image formats (JPG, PNG, WebP)',
    'Up to 10MB per image',
  ],
  pro: [
    '100 background removals / month',
    'PNG download',
    'All image formats (JPG, PNG, WebP)',
    'Up to 10MB per image',
    'Priority processing',
    'Usage dashboard',
    'Email support',
  ],
};

const faqs = [
  {
    q: 'How many free removals do I get?',
    a: 'Every new account gets 3 free background removals when you sign up. These don\'t expire, but they don\'t renew either — once used, you\'ll need to upgrade to Pro.',
  },
  {
    q: 'What happens when I reach my monthly limit on Pro?',
    a: 'Processing stops until your limit resets at the start of the next calendar month. You\'ll see a clear message with the reset date.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your Pro subscription at any time. You\'ll keep Pro access until the end of your current billing period.',
  },
  {
    q: 'What image formats are supported?',
    a: 'JPG, JPEG, PNG, and WebP. Maximum file size is 10MB per image.',
  },
  {
    q: 'How is the background removed?',
    a: 'We use the remove.bg API — a best-in-class AI model trained specifically for background removal. Results are typically returned in under 5 seconds.',
  },
  {
    q: 'Is my data safe?',
    a: 'Images are processed in real-time and not stored on our servers. We only keep metadata (filename, timestamp) for your usage history.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer refunds within 7 days of purchase if you haven\'t used any Pro features. Contact support@stepnewworld.com.',
  },
];

// Client component that uses search params
function PaymentStatusHandler() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const subscription = searchParams.get('subscription');
    const plan = searchParams.get('plan');

    if (payment === 'success') {
      setStatus({
        type: 'success',
        message: `Payment successful! You are now on the ${plan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly'} plan.`,
      });
    } else if (payment === 'cancelled') {
      setStatus({
        type: 'info',
        message: 'Payment was cancelled. You can try again when you\'re ready.',
      });
    } else if (subscription === 'success') {
      setStatus({
        type: 'success',
        message: `Subscription activated! You are now on the ${plan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly'} plan.`,
      });
    } else if (subscription === 'cancelled') {
      setStatus({
        type: 'info',
        message: 'Subscription was cancelled. You can try again when you\'re ready.',
      });
    }

    // Clear status after 5 seconds
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!status) return null;

  const bgColor = status.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                  status.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-300' :
                  'bg-sky-500/20 border-sky-500/50 text-sky-300';

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border ${bgColor} animate-in fade-in slide-in-from-top-2`}>
      {status.message}
    </div>
  );
}

export default function PricingPage() {
  const [billingMode, setBillingMode] = useState<'onetime' | 'subscription'>('onetime');

  return (
    <>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture`}
        strategy="lazyOnload"
      />
      <Suspense fallback={null}>
        <PaymentStatusHandler />
      </Suspense>

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">← Back to home</Link>
            <span className="text-slate-600">·</span>
            <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm">Dashboard</Link>
          </div>

          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-400 mb-3">Pricing</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Start free. Upgrade when you need more.
            </p>
          </div>

          {/* Billing Mode Toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setBillingMode('onetime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  billingMode === 'onetime'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                One-time Payment
              </button>
              <button
                onClick={() => setBillingMode('subscription')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  billingMode === 'subscription'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto-renew (Save 17%)
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold">$0</span>
                </div>
                <p className="text-slate-400 mt-2 text-sm">3 removals included at signup. No credit card required.</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {features.free.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/api/auth/signin"
                className="block text-center rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition px-6 py-3 font-semibold text-sm"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-sky-500/60 bg-sky-950/40 p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-sky-400 mb-1">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold">
                    {billingMode === 'subscription' ? '$3.99' : '$4.99'}
                  </span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-slate-400 mt-2 text-sm">
                  {billingMode === 'subscription' ? (
                    <>
                      Or $31.99/year — save 33%. Billed automatically.
                      <span className="text-sky-400 ml-1">Cancel anytime.</span>
                    </>
                  ) : (
                    <>
                      Or $39.99/year — save 33%. One-time payment.
                    </>
                  )}
                </p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {features.pro.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-sky-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* PayPal Buttons */}
              <div className="space-y-3">
                {billingMode === 'subscription' ? (
                  <>
                    <PayPalSubscribeButton
                      plan="pro_monthly"
                      onSuccess={() => window.location.href = '/dashboard'}
                    />
                    <p className="text-center text-xs text-slate-500 mt-2">
                      Secure payment via PayPal. Auto-renews monthly.
                    </p>
                  </>
                ) : (
                  <>
                    <PayPalButtons
                      plan="pro_monthly"
                      onSuccess={() => window.location.href = '/dashboard'}
                    />
                    <p className="text-center text-xs text-slate-500 mt-2">
                      Secure one-time payment via PayPal. No recurring charges.
                    </p>
                  </>
                )}

                {/* Yearly option */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400 mb-3">
                    <span className="text-white font-semibold">Yearly:</span>{' '}
                    {billingMode === 'subscription' ? '$31.99/year' : '$39.99/year'}{' '}
                    <span className="text-green-400">(save 33%)</span>
                  </p>
                  {billingMode === 'subscription' ? (
                    <PayPalSubscribeButton
                      plan="pro_yearly"
                      onSuccess={() => window.location.href = '/dashboard'}
                    />
                  ) : (
                    <PayPalButtons
                      plan="pro_yearly"
                      onSuccess={() => window.location.href = '/dashboard'}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-center mb-8">Plan comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Free</th>
                    <th className="text-center py-3 px-4 text-sky-400 font-medium">Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['Background removals', '3 total', '100 / month'],
                    ['Image formats', 'JPG, PNG, WebP', 'JPG, PNG, WebP'],
                    ['Max file size', '10MB', '10MB'],
                    ['Usage dashboard', '—', '✓'],
                    ['Priority processing', '—', '✓'],
                    ['Email support', '—', '✓'],
                    ['Monthly renewal', '—', '✓'],
                  ].map(([feature, free, pro]) => (
                    <tr key={String(feature)}>
                      <td className="py-3 px-4 text-slate-300">{feature}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{free}</td>
                      <td className="py-3 px-4 text-center text-sky-300">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
            <div className="space-y-4 max-w-2xl mx-auto">
              {faqs.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <p className="font-semibold mb-2">{q}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-10">
            <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-slate-400 mb-6">Sign up free — no credit card required.</p>
            <Link
              href="/api/auth/signin"
              className="inline-block rounded-xl bg-sky-500 hover:bg-sky-400 transition px-8 py-3 font-semibold"
            >
              Start for free
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
