'use client';

import { useEffect, useRef, useState } from 'react';

type Plan = 'pro_monthly' | 'pro_yearly';

interface PayPalButtonsProps {
  plan: Plan;
  clientId: string;
  onSuccess?: (data: { orderId: string; plan: Plan }) => void;
  onError?: (error: Error) => void;
}

export default function PayPalButtons({ plan, clientId, onSuccess, onError }: PayPalButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load PayPal SDK dynamically
  useEffect(() => {
    if (!clientId) {
      setError('PayPal configuration missing');
      setLoading(false);
      return;
    }

    // Check if SDK already loaded
    if ((window as any).paypal) {
      setSdkLoaded(true);
      setLoading(false);
      return;
    }

    // Load SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
      setLoading(false);
    };
    script.onerror = () => {
      setError('Failed to load PayPal SDK');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup not needed for PayPal SDK
    };
  }, [clientId]);

  // Render PayPal buttons when SDK is loaded
  useEffect(() => {
    if (!sdkLoaded || !containerRef.current) return;

    const paypal = (window as any).paypal;
    if (!paypal) {
      setError('PayPal SDK not available');
      return;
    }

    // Clear previous buttons
    containerRef.current.innerHTML = '';

    // Render PayPal buttons
    paypal.Buttons({
      style: {
        shape: 'pill',
        color: 'gold',
        layout: 'vertical',
        label: 'pay',
      },

      // Create order on our server
      createOrder: async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create order');
        }
        return data.orderId;
      },

      // Capture order after user approves
      onApprove: async (data: { orderID: string }) => {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderID, plan }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Payment capture failed');
        }
        onSuccess?.({ orderId: data.orderID, plan });
      },

      onError: (err: any) => {
        console.error('PayPal error:', err);
        setError('Payment failed. Please try again.');
        onError?.(err);
      },

      onCancel: () => {
        // User cancelled — no action needed
      },
    }).render(containerRef.current);
  }, [sdkLoaded, plan, onSuccess, onError]);

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
