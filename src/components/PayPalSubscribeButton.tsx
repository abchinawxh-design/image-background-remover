'use client';

import { useEffect, useRef, useState } from 'react';

type Plan = 'pro_monthly' | 'pro_yearly';

interface PayPalSubscribeButtonProps {
  plan: Plan;
  onSuccess?: (data: { subscriptionId: string; plan: Plan }) => void;
  onError?: (error: Error) => void;
}

export default function PayPalSubscribeButton({ plan, onSuccess, onError }: PayPalSubscribeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    if (!(window as any).paypal) {
      setError('PayPal SDK not loaded. Please refresh the page.');
      setLoading(false);
      return;
    }

    const paypal = (window as any).paypal;

    // Check if subscription plans are configured
    // We'll detect this by trying to create a subscription
    paypal.Buttons({
      style: {
        shape: 'pill',
        color: 'blue',
        layout: 'vertical',
        label: 'subscribe',
      },

      createSubscription: async (_data: any, actions: any) => {
        // First try our backend to get subscription ID
        const res = await fetch('/api/paypal/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const result = await res.json();
        if (!res.ok) {
          if (result.error?.includes('not configured')) {
            setNotConfigured(true);
            throw new Error('Subscription plans not configured');
          }
          throw new Error(result.error || 'Failed to create subscription');
        }
        return result.subscriptionId;
      },

      onApprove: async (data: { subscriptionID: string }) => {
        onSuccess?.({ subscriptionId: data.subscriptionID, plan });
      },

      onError: (err: any) => {
        console.error('PayPal subscription error:', err);
        if (!notConfigured) {
          setError('Subscription failed. Please try again or use one-time payment.');
          onError?.(err);
        }
      },

      onCancel: () => {
        // User cancelled
      },
    }).render(containerRef.current);

    setLoading(false);
  }, [plan, onSuccess, onError, notConfigured]);

  if (notConfigured) {
    return (
      <div className="text-slate-400 text-sm text-center py-2">
        Recurring subscriptions coming soon.
        <br />
        Please use one-time payment below.
      </div>
    );
  }

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400"></div>
        </div>
      )}
      {error && (
        <div className="text-red-400 text-sm text-center py-2">{error}</div>
      )}
      <div ref={containerRef} className={loading ? 'opacity-50' : ''} />
    </div>
  );
}
