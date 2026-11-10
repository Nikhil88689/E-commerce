"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Plus, Save, ShoppingBag, SlidersHorizontal, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { StudioViewer } from "@/components/studio/studio-viewer";
import { buildConfiguration, getConfigurationStock, getStudioAdditions, getStudioMaterials, makeConfigurationVariantId, studioFinishes, type ProductConfiguration, type StudioFinish, type StudioMaterial } from "@/lib/catalog/configuration";
import { productConfigurationSchema } from "@/lib/validation/configuration";
import type { CatalogProduct } from "@/lib/catalog/types";
import { useCartStore } from "@/state/cart-store";

type SaveState = "idle" | "saving" | "saved" | "device" | "error";

function getConfiguration(product: CatalogProduct, colorName: string, materialName: string, finishName: string, addOns: string[], size?: string) {
  const materials = getStudioMaterials(product);
  const colorIndex = Math.max(0, product.colors.findIndex((item) => item.name === colorName));
  const material = materials.find((item) => item.label === materialName) ?? materials[0];
  const finish = studioFinishes.find((item) => item.label === finishName) ?? studioFinishes[0];
  return buildConfiguration({ source: "studio", product, colorIndex, material, finish, addOns, size });
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

function formatSurcharge(amount: number, currency: string) {
  return amount === 0 ? "Included" : `+${formatPrice(amount, currency)}`;
}

function useSavedConfiguration(product: CatalogProduct, onLoad: (config: ProductConfiguration) => void) {
  useEffect(() => {
    let active = true;
    const key = `vanta-studio:${product.slug}:v1`;
    try {
      const local = productConfigurationSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"));
      if (local.success && active) onLoad(getConfiguration(product, local.data.colorName, local.data.material, local.data.finish, local.data.addOns, local.data.size));
    } catch { /* A damaged browser entry is ignored and replaced on the next save. */ }

    void fetch(`/api/configurations?product=${encodeURIComponent(product.slug)}`, { credentials: "same-origin" })
      .then(async (response) => response.ok ? response.json() as Promise<{ configuration?: unknown }> : null)
      .then((payload) => {
        if (!active || !payload?.configuration) return;
        const parsed = productConfigurationSchema.safeParse(payload.configuration);
        if (!parsed.success) return;
        const restored = getConfiguration(product, parsed.data.colorName, parsed.data.material, parsed.data.finish, parsed.data.addOns, parsed.data.size);
        onLoad(restored);
        localStorage.setItem(key, JSON.stringify(restored));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [product, onLoad]);
}

function OptionHeading({ index, title, note }: { index: string; title: string; note?: string }) {
  return <div className="studio-option__heading"><span className="studio-option__index">{index}</span><h3>{title}</h3>{note ? <small>{note}</small> : null}</div>;
}

function CustomizePanel({
  product,
  configuration,
  materials,
  selectedMaterial,
  selectedFinish,
  onColor,
  onMaterial,
  onFinish,
  onAddOn,
  onSize,
}: {
  product: CatalogProduct;
  configuration: ProductConfiguration;
  materials: StudioMaterial[];
  selectedMaterial: StudioMaterial;
  selectedFinish: StudioFinish;
  onColor: (name: string) => void;
  onMaterial: (material: StudioMaterial) => void;
  onFinish: (finish: StudioFinish) => void;
  onAddOn: (id: string) => void;
  onSize: (size: string) => void;
}) {
  const addOns = getStudioAdditions(product);
  return <div className="studio-customizer">
    <div className="studio-customizer__intro"><p className="eyebrow">Build your form</p><p>Choose a direction. Watch the object respond.</p></div>
    <section className="studio-option">
      <OptionHeading index="01" title="Color" note={configuration.colorName} />
      <div className="studio-swatch-list">{product.colors.map((color) => <button key={color.name} type="button" className={`studio-swatch${configuration.colorName === color.name ? " is-selected" : ""}`} aria-label={`Choose ${color.name}`} aria-pressed={configuration.colorName === color.name} onClick={() => onColor(color.name)}><span style={{ backgroundColor: color.hex }} /><small>{color.name}</small></button>)}</div>
    </section>
    <section className="studio-option">
      <OptionHeading index="02" title="Material" />
      <div className="studio-choice-list">{materials.map((item) => <button key={item.id} type="button" className={`studio-choice${selectedMaterial.id === item.id ? " is-selected" : ""}`} aria-pressed={selectedMaterial.id === item.id} onClick={() => onMaterial(item)}><span><strong>{item.label}</strong><small>{item.id === "primary" ? "Signature selection" : item.id === "anodized" ? "Recycled / refined" : "Dense, ceramic surface"}</small></span><small className="studio-choice__cost">{formatSurcharge(item.surchargeCents, product.currency)}</small></button>)}</div>
    </section>
    <section className="studio-option">
      <OptionHeading index="03" title="Finish" />
      <div className="studio-finish-list">{studioFinishes.map((finish) => <button key={finish.id} type="button" className={`studio-finish${selectedFinish.id === finish.id ? " is-selected" : ""}`} aria-pressed={selectedFinish.id === finish.id} onClick={() => onFinish(finish)}><span className={`studio-finish__surface studio-finish__surface--${finish.id}`} /><span>{finish.label}</span><small>{formatSurcharge(finish.surchargeCents, product.currency)}</small></button>)}</div>
    </section>
    {product.category === "footwear" ? <section className="studio-option">
      <OptionHeading index="04" title="Size" note="US / sample guide" />
      <div className="studio-size-list">{["39", "40", "41", "42", "43", "44", "45"].map((size) => <button type="button" key={size} className={configuration.size === size ? "is-selected" : ""} aria-pressed={configuration.size === size} onClick={() => onSize(size)}>{size}</button>)}</div>
    </section> : null}
    <section className="studio-option studio-option--last">
      <OptionHeading index={product.category === "footwear" ? "05" : "04"} title="Add-ons" note="Optional" />
      <div className="studio-addon-list">{addOns.map((addition) => {
        const selected = configuration.addOns.includes(addition.id);
        return <button key={addition.id} type="button" className={`studio-addon${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => onAddOn(addition.id)}><span className="studio-addon__check">{selected ? <Check size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}</span><span><strong>{addition.label}</strong><small>Made to work with this form</small></span><small className="studio-choice__cost">{formatSurcharge(addition.surchargeCents, product.currency)}</small></button>;
      })}</div>
    </section>
  </div>;
}

export function StudioExperience({ product }: Readonly<{ product: CatalogProduct }>) {
  const router = useRouter();
  const materials = useMemo(() => getStudioMaterials(product), [product]);
  const defaultConfiguration = useMemo(() => buildConfiguration({ source: "studio", product, colorIndex: 0, material: materials[0], finish: studioFinishes[0], addOns: [], size: product.category === "footwear" ? "42" : undefined }), [product, materials]);
  const [configuration, setConfiguration] = useState(defaultConfiguration);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const selectedMaterial = materials.find((item) => item.label === configuration.material) ?? materials[0];
  const selectedFinish = studioFinishes.find((item) => item.label === configuration.finish) ?? studioFinishes[0];
  const variantId = makeConfigurationVariantId(product.id, configuration);
  const selectedStock = getConfigurationStock(product, configuration);
  const itemQuantity = cartItems.filter((item) => item.productId === product.id).reduce((total, item) => total + item.quantity, 0);
  const currentVariantInBag = cartItems.some((item) => item.variantId === variantId);
  const selectedVariantQuantity = cartItems.filter((item) => item.variantId === variantId).reduce((total, item) => total + item.quantity, 0);
  const hasVariants = !!product.variants?.some((variant) => variant.isActive);
  const unavailable = selectedStock === 0;
  const stockLimitReached = (hasVariants ? selectedVariantQuantity : itemQuantity) >= selectedStock;
  const restore = useCallback((next: ProductConfiguration) => setConfiguration(next), []);
  useSavedConfiguration(product, restore);

  function update(colorName = configuration.colorName, material = selectedMaterial, finish = selectedFinish, addOns = configuration.addOns, size = configuration.size) {
    setConfiguration(getConfiguration(product, colorName, material.label, finish.label, addOns, size));
  }

  function save() {
    const key = `vanta-studio:${product.slug}:v1`;
    try {
      localStorage.setItem(key, JSON.stringify(configuration));
    } catch {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    void fetch("/api/configurations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productSlug: product.slug, configuration }),
    }).then((response) => {
      if (response.ok) setSaveState("saved");
      else if (response.status === 401) setSaveState("device");
      else setSaveState("device");
    }).catch(() => setSaveState("device"));
  }

  function addToBag(buyNow = false) {
    if (unavailable || (stockLimitReached && !(buyNow && currentVariantInBag))) return;
    if (!buyNow || !currentVariantInBag) addItem({ productId: product.id, variantId, slug: product.slug, name: product.name, unitAmount: configuration.unitPriceCents, currency: product.currency, imageUrl: product.images[0], configuration });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1900);
    if (buyNow) router.push("/checkout");
  }

  const customizeProps = {
    product,
    configuration,
    materials,
    selectedMaterial,
    selectedFinish,
    onColor: (name: string) => update(name),
    onMaterial: (item: StudioMaterial) => update(configuration.colorName, item),
    onFinish: (item: StudioFinish) => update(configuration.colorName, selectedMaterial, item),
    onAddOn: (id: string) => update(configuration.colorName, selectedMaterial, selectedFinish, configuration.addOns.includes(id) ? configuration.addOns.filter((item) => item !== id) : [...configuration.addOns, id]),
    onSize: (size: string) => update(configuration.colorName, selectedMaterial, selectedFinish, configuration.addOns, size),
  };

  return <main id="main-content" className="studio-page">
    <header className="studio-topbar">
      <Link href={`/product/${product.slug}`} className="studio-back"><ArrowLeft size={14} aria-hidden="true" /> Product details</Link>
      <div><span className="studio-topbar__index">V / STUDIO / 01</span><span className="studio-topbar__rule" /><span className="studio-topbar__status"><span /> Interactive form study</span></div>
      <button type="button" className="studio-mobile-options" onClick={() => setMobileOptionsOpen(true)}><SlidersHorizontal size={15} aria-hidden="true" /> Configure</button>
    </header>
    <div className="studio-workspace">
      <aside className="studio-left-panel" aria-label="Product customization options"><CustomizePanel {...customizeProps} /></aside>
      <div className="studio-stage-column">
        <div className="studio-model-heading"><div><p className="eyebrow">Interactive product studio</p><h1>{product.name}</h1></div><span>01 / 01<br />VANTA OBJECT</span></div>
        <StudioViewer product={product} configuration={configuration} material={selectedMaterial} finish={selectedFinish} />
        <div className="studio-stage-note"><span>Design the details. The model changes as you do.</span><span>DRAG / ZOOM / ROTATE</span></div>
      </div>
      <aside className="studio-right-panel">
        <div className="studio-product-summary"><p className="eyebrow">{product.categoryName} / Demo form</p><h2>{product.name}</h2><p>{product.description}</p>
          <div className="studio-product-summary__image"><Image src={product.images[0] ?? "/images/concepts/object-concept.webp"} alt={product.imageAlt} fill sizes="360px" /></div>
          <div className="studio-price-line"><span>Configuration total</span><strong aria-live="polite">{formatPrice(configuration.unitPriceCents, product.currency)}</strong></div>
          <p className="studio-price-note">Includes selected options. Sample price only.</p>
          <div className="studio-summary-details"><span>Color</span><strong>{configuration.colorName}</strong><span>Material</span><strong>{configuration.material}</strong><span>Finish</span><strong>{configuration.finish}</strong>{configuration.size ? <><span>Size</span><strong>US {configuration.size}</strong></> : null}</div>
          <button type="button" className="studio-save" onClick={save} disabled={saveState === "saving"}><Save size={14} aria-hidden="true" />{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved to account" : "Save configuration"}</button>
          <AnimatePresence mode="wait"><motion.p key={saveState} className={`studio-save-status studio-save-status--${saveState}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-live="polite">{saveState === "device" ? "Saved on this device. Account sync is available when sign-in is connected." : saveState === "saved" ? "Configuration synced to your VANTA account." : saveState === "error" ? "Browser storage is unavailable. The configuration could not be saved." : "Your selections are stored on this device and can sync to an account."}</motion.p></AnimatePresence>
          <button type="button" className="button button--primary studio-add-button" onClick={() => addToBag()} disabled={unavailable || stockLimitReached}>{added ? "Added to demo bag" : unavailable ? "Unavailable in demo stock" : stockLimitReached ? "Stock limit reached" : "Add configuration to bag"}{added ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}</button>
          <button type="button" className="studio-buy-button" onClick={() => addToBag(true)} disabled={unavailable || (stockLimitReached && !currentVariantInBag)}>Continue to checkout <ArrowRight size={14} aria-hidden="true" /></button>
          <p className="studio-demo-disclosure"><Sparkles size={12} aria-hidden="true" /> Sample stock and pricing. Checkout uses Stripe test mode when server credentials are configured.</p>
        </div>
        <Link className="studio-return-link" href={`/product/${product.slug}`}><ArrowLeft size={13} aria-hidden="true" /> Return to product details</Link>
      </aside>
    </div>
    <div className="studio-mobile-dock"><div><span>{formatPrice(configuration.unitPriceCents, product.currency)}</span><small>DEMO CONFIGURATION</small></div><button type="button" onClick={() => addToBag()} disabled={unavailable || stockLimitReached}>{added ? <Check size={15} /> : <ShoppingBag size={15} />}{added ? "Added" : unavailable ? "Unavailable" : stockLimitReached ? "Stock limit" : "Add to bag"}</button></div>
    <Modal open={mobileOptionsOpen} onOpenChange={setMobileOptionsOpen} title="Configure your form" variant="drawer" className="studio-options-drawer"><CustomizePanel {...customizeProps} /></Modal>
    <span className="studio-accessible-status sr-only" aria-live="polite">{added ? `${product.name} configuration added to your demo bag` : ""}</span>
  </main>;
}
