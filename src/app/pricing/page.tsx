import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Image Background Remover",
  description: "Simple, transparent pricing. Start free with 3 removals, upgrade to Pro for 100/month.",
};

const features = {
  free: [
    "3 background removals (one-time)",
    "PNG download",
    "All image formats (JPG, PNG, WebP)",
    "Up to 10MB per image",
  ],
  pro: [
    "100 background removals / month",
    "PNG download",
    "All image formats (JPG, PNG, WebP)",
    "Up to 10MB per image",
    "Priority processing",
    "Usage dashboard",
    "Email support",
  ],
};

const faqs = [
  {
    q: "How many free removals do I get?",
    a: "Every new account gets 3 free background removals when you sign up. These don't expire, but they don't renew either — once used, you'll need to upgrade to Pro.",
  },
  {
    q: "What happens when I reach my monthly limit on Pro?",
    a: "Processing stops until your limit resets at the start of the next calendar month. You'll see a clear message with the reset date.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your Pro subscription at any time. You'll keep Pro access until the end of your current billing period.",
  },
  {
    q: "What image formats are supported?",
    a: "JPG, JPEG, PNG, and WebP. Maximum file size is 10MB per image.",
  },
  {
    q: "How is the background removed?",
    a: "We use the remove.bg API — a best-in-class AI model trained specifically for background removal. Results are typically returned in under 5 seconds.",
  },
  {
    q: "Is my data safe?",
    a: "Images are processed in real-time and not stored on our servers. We only keep metadata (filename, timestamp) for your usage history.",
  },
  {
    q: "Do you offer a yearly plan?",
    a: "Yes — the Pro Yearly plan is $39.99/year (save 33% vs monthly). Payment via PayPal coming soon.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400 mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need more.
          </p>
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
                <span className="text-5xl font-bold">$4.99</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <p className="text-slate-400 mt-2 text-sm">Or $39.99/year — save 33%. Cancel anytime.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {features.pro.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-sky-400 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {/* PayPal coming soon */}
            <div className="space-y-3">
              <a
                href="mailto:support@stepnewworld.com?subject=Pro%20Plan%20Upgrade&body=Hi%2C%20I%27d%20like%20to%20upgrade%20to%20Pro."
                className="block text-center rounded-xl bg-sky-500 hover:bg-sky-400 transition px-6 py-3 font-semibold text-sm"
              >
                Upgrade to Pro →
              </a>
              <p className="text-center text-xs text-slate-500">PayPal checkout coming soon. Email us to upgrade manually.</p>
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
                  ["Background removals", "3 total", "100 / month"],
                  ["Image formats", "JPG, PNG, WebP", "JPG, PNG, WebP"],
                  ["Max file size", "10MB", "10MB"],
                  ["Usage dashboard", "—", "✓"],
                  ["Priority processing", "—", "✓"],
                  ["Email support", "—", "✓"],
                  ["Monthly renewal", "—", "✓"],
                ].map(([feature, free, pro]) => (
                  <tr key={feature}>
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
  );
}
