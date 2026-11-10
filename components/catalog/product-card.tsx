"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Heart, ShoppingBag, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useCartStore } from "@/state/cart-store";
import { buildConfiguration, getConfigurationStock, getStudioMaterials, makeConfigurationVariantId, studioFinishes } from "@/lib/catalog/configuration";
import type { CatalogProduct } from "@/lib/catalog/types";

const WISHLIST_KEY = "vanta:wishlist:v1";
const WISHLIST_EVENT = "vanta:wishlist-changed";

function readWishlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function WishlistButton({ product }: Readonly<{ product: CatalogProduct }>) {
  const prefersReducedMotion = useReducedMotion();
  const [syncError, setSyncError] = useState("");
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(WISHLIST_EVENT, notify);
    window.addEventListener("storage", notify);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, notify);
      window.removeEventListener("storage", notify);
    };
  }, []);
  const getSnapshot = useCallback(() => readWishlist().includes(product.id), [product.id]);
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const current = readWishlist();
    const next = saved ? current.filter((id) => id !== product.id) : [...current, product.id];
    setSyncError("");
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(WISHLIST_EVENT));
    } catch {
      // Keep the current state if local storage is unavailable.
    }
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

  return <>
    <motion.button className={`catalog-card__wishlist${saved ? " is-saved" : ""}`} type="button" data-cursor-label={saved ? "SAVED" : "SAVE"} onClick={toggle} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} whileTap={prefersReducedMotion ? undefined : { scale: 0.84 }}>
      <Heart aria-hidden="true" size={17} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} />
    </motion.button>
    {syncError ? <span className="catalog-card__wishlist-error" role="status">{syncError}</span> : null}
  </>;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

function stockLabel(stockQuantity: number) {
  if (stockQuantity === 0) return "Currently unavailable";
  if (stockQuantity <= 4) return `Only ${stockQuantity} left`;
  return "In stock";
}

export function ProductCard({ product, index }: Readonly<{ product: CatalogProduct; index: number }>) {
  const prefersReducedMotion = useReducedMotion();
  const addItem = useCartStore((state) => state.addItem);
  const defaultConfiguration = buildConfiguration({ source: "product", product, colorIndex: 0, material: getStudioMaterials(product)[0], finish: studioFinishes[0], addOns: [], size: product.category === "footwear" ? "42" : undefined });
  const defaultVariantId = makeConfigurationVariantId(product.id, defaultConfiguration);
  const quantityInBag = useCartStore((state) => state.items.find((item) => item.variantId === defaultVariantId)?.quantity ?? 0);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const currentPrice = defaultConfiguration.unitPriceCents;
  const selectedStock = getConfigurationStock(product, defaultConfiguration);
  const availability = selectedStock === 0 ? "sold-out" : selectedStock <= 4 ? "low-stock" : "in-stock";
  const limitReached = quantityInBag >= selectedStock;

  function quickAdd() {
    if (selectedStock === 0 || limitReached) return;
    addItem({
      productId: product.id,
      variantId: defaultVariantId,
      slug: product.slug,
      name: product.name,
      unitAmount: defaultConfiguration.unitPriceCents,
      currency: product.currency,
      imageUrl: product.images[0],
      configuration: defaultConfiguration,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <motion.article
      className="catalog-card"
      layout
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.42, delay: prefersReducedMotion ? 0 : Math.min(index, 6) * 0.045 }}
      onMouseEnter={() => product.images.length > 1 && setActiveImage(1)}
      onMouseLeave={() => setActiveImage(0)}
      onFocus={() => product.images.length > 1 && setActiveImage(1)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveImage(0);
      }}
    >
      <div className="catalog-card__media">
        <Link href={`/product/${product.slug}`} className="catalog-card__image-link" data-cursor-label="VIEW">
          <AnimatePresence initial={false} mode="sync">
            <motion.div className="catalog-card__image-frame" key={product.images[activeImage] ?? product.images[0]} initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.32 }}>
              <Image src={product.images[activeImage] ?? product.images[0]} alt={product.imageAlt} fill sizes="(max-width: 640px) 82vw, (max-width: 1050px) 46vw, 25vw" quality={84} />
            </motion.div>
          </AnimatePresence>
          {product.salePriceCents !== null ? <span className="catalog-card__badge">Demo price</span> : null}
          <span className={`catalog-card__stock catalog-card__stock--${availability}`}>{availability === "sold-out" ? "Unavailable" : availability === "low-stock" ? "Limited" : "In stock"}</span>
          <span className="catalog-card__open" aria-hidden="true"><ArrowUpRight size={17} strokeWidth={1.4} /></span>
        </Link>
        <WishlistButton product={product} />
        {product.images.length > 1 ? (
          <div className="catalog-card__image-count" aria-label={`${product.images.length} product views`}>
            {product.images.map((image, imageIndex) => (
              <button key={image} type="button" className={imageIndex === activeImage ? "is-active" : ""} onClick={() => setActiveImage(imageIndex)} aria-label={`Show product view ${imageIndex + 1}`} aria-pressed={imageIndex === activeImage} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="catalog-card__body">
        <div className="catalog-card__eyebrow"><span>{product.categoryName} / Form study</span><span className="catalog-card__rating"><Star aria-hidden="true" size={12} fill="currentColor" /> {product.averageRating.toFixed(1)} <small>({product.ratingCount})</small></span></div>
        <Link href={`/product/${product.slug}`} className="catalog-card__title-link"><h2>{product.name}</h2></Link>
        <p className="catalog-card__materials">{product.materials.join(" · ")}</p>
        <div className="catalog-card__colors" aria-label={`Available colors: ${product.colors.map((item) => item.name).join(", ")}`}>
          {product.colors.map((item) => <span key={item.name} title={item.name} style={{ "--swatch": item.hex } as React.CSSProperties} />)}
          <small>{stockLabel(selectedStock)}</small>
        </div>
        <div className="catalog-card__purchase">
          <p className="catalog-card__price" aria-label={product.salePriceCents ? `Sale price ${formatPrice(currentPrice, product.currency)}, reduced from ${formatPrice(product.priceCents + defaultConfiguration.surchargeCents, product.currency)}` : `Price ${formatPrice(currentPrice, product.currency)}`}>
            {product.salePriceCents !== null ? <><span>{formatPrice(currentPrice, product.currency)}</span><del>{formatPrice(product.priceCents + defaultConfiguration.surchargeCents, product.currency)}</del></> : formatPrice(currentPrice, product.currency)}
          </p>
          <motion.button className="catalog-card__quick-add" type="button" data-cursor-label={added ? "ADDED" : "ADD"} onClick={quickAdd} disabled={selectedStock === 0 || limitReached} aria-label={selectedStock === 0 ? `${product.name} unavailable in demo stock` : limitReached ? `${product.name} demo stock limit reached` : `${added ? "Added" : "Quick add"} ${product.name}`} whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}>
            <AnimatePresence initial={false} mode="wait">
              <motion.span key={added ? "added" : "add-label"} initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3 }} transition={{ duration: prefersReducedMotion ? 0 : 0.16 }} aria-live="polite">
                {added ? "Added" : selectedStock === 0 ? "Unavailable" : limitReached ? "Stock limit" : "Quick add"}
              </motion.span>
            </AnimatePresence>
            {added ? <Check aria-hidden="true" size={14} /> : <ShoppingBag aria-hidden="true" size={14} />}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
