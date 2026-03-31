import type { Metadata } from "next";
import Link from "next/link";
import PricingContent from "./PricingContent";

export const metadata: Metadata = {
  title: "Pricing — Image Background Remover",
  description: "Simple, transparent pricing. Start free with 3 removals, upgrade to Pro for 100/month.",
};

// Server component - can access env vars
export default function PricingPage() {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  
  return (
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

        {/* Content with PayPal */}
        <PricingContent paypalClientId={paypalClientId} />

        {/* Bottom CTA */}
        <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-10 mt-16">
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
  );
}
