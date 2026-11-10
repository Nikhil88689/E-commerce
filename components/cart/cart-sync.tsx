"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCartStore, type CartItem } from "@/state/cart-store";

function mergeByVariant(local: CartItem[], remote: CartItem[]) {
  const merged = new Map(remote.map((item) => [item.variantId, item]));
  for (const item of local) {
    const existing = merged.get(item.variantId);
    merged.set(item.variantId, existing ? { ...existing, quantity: Math.min(50, Math.max(existing.quantity, item.quantity)) } : item);
  }
  return [...merged.values()];
}

export function CartSync() {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const savedItems = useCartStore((state) => state.savedItems);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const [authenticated, setAuthenticated] = useState(false);
  const initialized = useRef(false);
  const signature = useMemo(() => JSON.stringify({
    items: items.map(({ variantId, slug, quantity, configuration }) => ({ variantId, slug, quantity, configuration })),
    savedItems: savedItems.map(({ variantId, slug, quantity, configuration }) => ({ variantId, slug, quantity, configuration })),
  }), [items, savedItems]);
  const lastSent = useRef("");

  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (response.status === 401 || response.status === 503) return;
        if (!response.ok) return;
        const remote = await response.json() as { items: CartItem[]; savedItems: CartItem[] };
        const current = useCartStore.getState();
        replaceItems(mergeByVariant(current.items, remote.items), mergeByVariant(current.savedItems, remote.savedItems));
        setAuthenticated(true);
      } catch {
        // The local persisted bag remains available when account sync is offline.
      }
    })();
  }, [hydrated, replaceItems]);

  useEffect(() => {
    if (!authenticated || !signature || signature === lastSent.current) return;
    const timer = window.setTimeout(() => {
      const current = useCartStore.getState();
      const payload = {
        items: current.items.map(({ variantId, slug, quantity, configuration }) => ({ variantId, productSlug: slug, quantity, configuration })),
        savedItems: current.savedItems.map(({ variantId, slug, quantity, configuration }) => ({ variantId, productSlug: slug, quantity, configuration })),
      };
      void fetch("/api/cart", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
        .then(async (response) => {
          if (!response.ok) return;
          const saved = await response.json() as { items: CartItem[]; savedItems: CartItem[] };
          lastSent.current = JSON.stringify({
            items: current.items.map(({ variantId, slug, quantity, configuration }) => ({ variantId, slug, quantity, configuration })),
            savedItems: current.savedItems.map(({ variantId, slug, quantity, configuration }) => ({ variantId, slug, quantity, configuration })),
          });
          const latest = useCartStore.getState();
          const submittedStillCurrent = lastSent.current === signature;
          if (submittedStillCurrent) replaceItems(saved.items, saved.savedItems);
          else if (latest.items.length === 0 && latest.savedItems.length === 0) replaceItems(saved.items, saved.savedItems);
        })
        .catch(() => {
          // A sync failure never blocks local cart actions or checkout.
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authenticated, replaceItems, signature]);

  return null;
}
