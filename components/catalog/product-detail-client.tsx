"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/state/cart-store";
import type { CatalogProduct } from "@/lib/catalog/types";
import { buildConfiguration, getConfigurationStock, getStudioMaterials, makeConfigurationVariantId, studioFinishes } from "@/lib/catalog/configuration";

export function AddToBagButton({ product }: Readonly<{ product: CatalogProduct }>) {
  const addItem = useCartStore((state) => state.addItem);
  const configuration = buildConfiguration({ source: "product", product, colorIndex: 0, material: getStudioMaterials(product)[0], finish: studioFinishes[0], addOns: [], size: product.category === "footwear" ? "42" : undefined });
  const variantId = makeConfigurationVariantId(product.id, configuration);
  const selectedStock = getConfigurationStock(product, configuration);
  const quantityInBag = useCartStore((state) => state.items.find((item) => item.variantId === variantId)?.quantity ?? 0);
  const [added, setAdded] = useState(false);
  const unavailable = selectedStock === 0;
  const limitReached = quantityInBag >= selectedStock;

  function addToBag() {
    if (unavailable || limitReached) return;
    addItem({
      productId: product.id,
      variantId,
      slug: product.slug,
      name: product.name,
      unitAmount: configuration.unitPriceCents,
      currency: product.currency,
      imageUrl: product.images[0],
      configuration,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button className="button button--primary product-detail__add" type="button" onClick={addToBag} disabled={unavailable || limitReached}>
      {unavailable ? "Unavailable in demo stock" : limitReached ? "Demo stock limit reached" : added ? "Added to demo bag" : "Add to bag"}
      {added ? <Check aria-hidden="true" size={16} /> : <ShoppingBag aria-hidden="true" size={16} />}
    </button>
  );
}
