"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/state/cart-store";
import type { CheckoutQuote } from "@/lib/checkout/pricing";

type QuoteResponse = {
  quote: CheckoutQuote;
  paymentReady: boolean;
  paymentUnavailableMessage: string;
};

export function useCheckoutQuote(items: CartItem[], shippingMethod: "standard" | "express", discountCode: string) {
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestBody = useMemo(() => JSON.stringify({
    items: items.map((item) => ({ variantId: item.variantId, productSlug: item.slug, quantity: item.quantity, configuration: item.configuration })),
    shippingMethod,
    discountCode: discountCode.trim() || undefined,
  }), [items, shippingMethod, discountCode]);

  useEffect(() => {
    if (!items.length) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setResult(null);
      setError(null);
      void fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      }).then(async (response) => {
        const payload = await response.json() as QuoteResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "We could not refresh your order total.");
        setResult(payload);
      }).catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "We could not refresh your order total.");
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [items.length, requestBody]);

  const isEmpty = items.length === 0;
  return { quote: isEmpty ? null : result?.quote ?? null, paymentReady: result?.paymentReady ?? false, paymentUnavailableMessage: result?.paymentUnavailableMessage ?? "Secure test checkout is not configured for this environment.", error: isEmpty ? null : error, loading: isEmpty ? false : loading };
}
