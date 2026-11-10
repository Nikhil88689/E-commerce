import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductConfiguration } from "@/lib/catalog/configuration";

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  unitAmount: number;
  currency: string;
  imageUrl?: string;
  configuration?: ProductConfiguration;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  savedItems: CartItem[];
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  saveForLater: (variantId: string) => void;
  moveToBag: (variantId: string) => void;
  removePurchasedQuantity: (variantId: string, quantity: number) => void;
  replaceItems: (items: CartItem[], savedItems: CartItem[]) => void;
  clear: () => void;
  setHydrated: (isHydrated: boolean) => void;
};

export const useCartStore = create<CartStore>()(
  persist<CartStore, [], [], Pick<CartStore, "items" | "savedItems">>(
    (set) => ({
      items: [],
      savedItems: [],
      isHydrated: false,
      addItem: (item, quantity = 1) => {
        if (!Number.isInteger(quantity) || quantity < 1) return;

        set((state) => {
          const existing = state.items.find((entry) => entry.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((entry) =>
                entry.variantId === item.variantId
                  ? { ...entry, quantity: entry.quantity + quantity }
                  : entry,
              ),
            };
          }

          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((item) => item.variantId !== variantId) })),
      setQuantity: (variantId, quantity) => {
        if (!Number.isInteger(quantity)) return;
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.variantId !== variantId)
              : state.items.map((item) =>
                  item.variantId === variantId ? { ...item, quantity } : item,
                ),
        }));
      },
      saveForLater: (variantId) =>
        set((state) => {
          const item = state.items.find((entry) => entry.variantId === variantId);
          if (!item) return state;
          const saved = state.savedItems.find((entry) => entry.variantId === variantId);
          return {
            items: state.items.filter((entry) => entry.variantId !== variantId),
            savedItems: saved
              ? state.savedItems.map((entry) => entry.variantId === variantId ? { ...entry, quantity: entry.quantity + item.quantity } : entry)
              : [...state.savedItems, item],
          };
        }),
      moveToBag: (variantId) =>
        set((state) => {
          const item = state.savedItems.find((entry) => entry.variantId === variantId);
          if (!item) return state;
          const existing = state.items.find((entry) => entry.variantId === variantId);
          return {
            savedItems: state.savedItems.filter((entry) => entry.variantId !== variantId),
            items: existing
              ? state.items.map((entry) => entry.variantId === variantId ? { ...entry, quantity: entry.quantity + item.quantity } : entry)
              : [...state.items, item],
          };
        }),
      removePurchasedQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            if (item.variantId !== variantId) return [item];
            const remainder = item.quantity - quantity;
            return remainder > 0 ? [{ ...item, quantity: remainder }] : [];
          }),
        })),
      replaceItems: (items, savedItems) => set({ items, savedItems }),
      clear: () => set({ items: [] }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: "vanta-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, savedItems: state.savedItems }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
