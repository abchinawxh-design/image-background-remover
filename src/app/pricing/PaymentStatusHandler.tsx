'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function StatusBanner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const subscription = searchParams.get('subscription');
    const plan = searchParams.get('plan');
    const planLabel = plan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly';

    if (payment === 'success') {
      setStatus({ type: 'success', message: `Payment successful! You are now on the ${planLabel} plan.` });
    } else if (payment === 'cancelled') {
      setStatus({ type: 'info', message: "Payment was cancelled. You can try again when you're ready." });
    } else if (subscription === 'success') {
      setStatus({ type: 'success', message: `Subscription activated! You are now on the ${planLabel} plan.` });
    } else if (subscription === 'cancelled') {
      setStatus({ type: 'info', message: "Subscription was cancelled. You can try again when you're ready." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  if (!status) return null;

  const bgColor =
    status.type === 'success'
      ? 'bg-green-500/20 border-green-500/50 text-green-300'
      : 'bg-sky-500/20 border-sky-500/50 text-sky-300';

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border ${bgColor}`}>
      {status.message}
    </div>
  );
}

export default function PaymentStatusHandler() {
  return (
    <Suspense fallback={null}>
      <StatusBanner />
    </Suspense>
  );
}
