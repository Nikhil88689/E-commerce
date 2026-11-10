"use client";

import { useCallback, useSyncExternalStore, useState } from "react";
import { ArrowRight, Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { buildConfiguration, getConfigurationStock, getStudioMaterials, makeConfigurationVariantId, studioFinishes } from "@/lib/catalog/configuration";
import { useCartStore } from "@/state/cart-store";
import type { CatalogProduct } from "@/lib/catalog/types";

const WISHLIST_KEY = "vanta:wishlist:v1";
const WISHLIST_EVENT = "vanta:wishlist-changed";

function wishlistSnapshot() {
  return false;
}

function isProductSaved(productId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) && saved.includes(productId);
  } catch {
    return false;
  }
}

function WishlistControl({ product }: Readonly<{ product: CatalogProduct }>) {
  const [syncError, setSyncError] = useState("");
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(WISHLIST_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(WISHLIST_EVENT, onChange);
    };
  }, []);
  const getSnapshot = useCallback(() => isProductSaved(product.id), [product.id]);
  const saved = useSyncExternalStore(subscribe, getSnapshot, wishlistSnapshot);

  function toggle() {
    setSyncError("");
    try {
      const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as unknown;
      const current = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
      const next = saved ? current.filter((id) => id !== product.id) : [...current, product.id];
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(WISHLIST_EVENT));
    } catch { /* Saved items are optional if storage is unavailable. */ }
    void fetch("/api/account/wishlist", {
      method: saved ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productSlug: product.slug }),
    }).then(async (response) => {
      if (response.status === 401) return;
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        setSyncError(result.error ?? "Your account wishlist could not be updated.");
      }
    }).catch(() => setSyncError("Your account wishlist could not be updated."));
  }

  return <div><button type="button" className={`product-detail__wishlist${saved ? " is-saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} onClick={toggle}><Heart aria-hidden="true" size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}</button>{syncError ? <p className="account-action-error" role="status">{syncError}</p> : null}</div>;
}

export function ProductDetailControls({ product }: Readonly<{ product: CatalogProduct }>) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState("42");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const color = product.colors[colorIndex] ?? { name: "Original", hex: "#aaa99f" };
  const material = getStudioMaterials(product)[0];
  const finish = studioFinishes[0];
  const configuration = buildConfiguration({ source: "product", product, colorIndex, material, finish, addOns: [], size: product.category === "footwear" ? size : undefined });
  const variantId = makeConfigurationVariantId(product.id, configuration);
  const selectedStock = getConfigurationStock(product, configuration);
  const quantityInBag = useCartStore((state) => state.items.find((item) => item.variantId === variantId)?.quantity ?? 0);
  const productQuantityInBag = useCartStore((state) => state.items.filter((item) => item.productId === product.id).reduce((total, item) => total + item.quantity, 0));
  const hasVariants = !!product.variants?.some((variant) => variant.isActive);
  const bagQuantityForStock = hasVariants ? quantityInBag : productQuantityInBag;
  const unavailable = selectedStock === 0;
  const stockLimitReached = bagQuantityForStock + quantity > selectedStock;
  const buyNowLimitReached = bagQuantityForStock + Math.max(0, quantity - quantityInBag) > selectedStock;
  const sizes = ["39", "40", "41", "42", "43", "44", "45"];

  function addToBag(buyNow = false) {
    if (unavailable || (buyNow ? buyNowLimitReached : stockLimitReached)) return;
    const quantityToAdd = buyNow ? Math.max(0, quantity - quantityInBag) : quantity;
    if (quantityToAdd > 0) addItem({
      productId: product.id,
      variantId,
      slug: product.slug,
      name: product.name,
      unitAmount: configuration.unitPriceCents,
      currency: product.currency,
      imageUrl: product.images[0],
      configuration,
    }, quantityToAdd);
    if (buyNow) {
      router.push("/checkout");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="product-purchase-panel">
      <div className="product-detail__option">
        <div className="product-detail__option-heading"><span>Color / {color.name}</span><span>{product.colors.length} directions</span></div>
        <div className="product-detail__color-options">{product.colors.map((item, index) => <button key={item.name} type="button" className={index === colorIndex ? "is-selected" : ""} style={{ "--swatch": item.hex } as React.CSSProperties} aria-label={`Select ${item.name}`} aria-pressed={index === colorIndex} onClick={() => setColorIndex(index)}><span />{item.name}</button>)}</div>
      </div>
      {product.category === "footwear" ? <div className="product-detail__option"><div className="product-detail__option-heading"><span>Size / US</span><button type="button" className="text-button" aria-expanded={sizeGuideOpen} onClick={() => setSizeGuideOpen((open) => !open)}>Size guide <ArrowRight aria-hidden="true" size={12} /></button></div><div className="product-detail__sizes">{sizes.map((item) => <button type="button" key={item} className={size === item ? "is-selected" : ""} aria-label={`Select US size ${item}`} aria-pressed={size === item} onClick={() => setSize(item)}>{item}</button>)}</div>{sizeGuideOpen ? <p className="product-detail__size-note">Sample fit guide: choose your usual US size. Live measurements will be confirmed at launch.</p> : null}</div> : null}
      <div className="product-detail__quantity"><span>Quantity</span><div><button type="button" aria-label="Reduce quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}><Minus aria-hidden="true" size={13} /></button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(Math.max(1, selectedStock - bagQuantityForStock), value + 1))} disabled={quantity + bagQuantityForStock >= selectedStock}><Plus aria-hidden="true" size={13} /></button></div></div>
      <div className="product-detail__actions">
        <button className="button button--primary product-detail__add" type="button" onClick={() => addToBag()} disabled={unavailable || stockLimitReached}>{unavailable ? "Unavailable in demo stock" : stockLimitReached ? "Stock limit reached" : added ? "Added to your demo bag" : "Add to bag"}{added ? <Check aria-hidden="true" size={16} /> : <ShoppingBag aria-hidden="true" size={16} />}</button>
        <button className="button button--outline product-detail__buy" type="button" onClick={() => addToBag(true)} disabled={unavailable || buyNowLimitReached}>Buy now <ArrowRight aria-hidden="true" size={15} /></button>
      </div>
      <WishlistControl product={product} />
      <div className="product-detail__delivery"><p className="eyebrow">Delivery / Returns</p><p>Shipping estimates and return terms will be confirmed when this collection launches.</p></div>
    </div>
  );
}
