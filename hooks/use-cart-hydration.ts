"use client";

import { useEffect } from "react";
import { useCartStore } from "@/state/cart-store";

export function useCartHydration() {
  const isHydrated = useCartStore((state) => state.isHydrated);

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) {
      void useCartStore.persist.rehydrate();
    }
  }, []);

  return isHydrated;
}
