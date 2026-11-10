import { buildConfiguration, getConfigurationStock, getStudioAdditions, getStudioMaterials, getEffectivePrice, makeConfigurationVariantId, matchingProductVariants, studioFinishes, type ProductConfiguration } from "@/lib/catalog/configuration";
import { getCatalogProduct } from "@/lib/catalog/service";
import type { CatalogProduct } from "@/lib/catalog/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CheckoutQuoteRequest } from "@/lib/checkout/schemas";

export type CheckoutQuoteLine = {
  /** Server-derived canonical identity used by orders and payments. */
  variantId: string;
  /** Local cart rows represented by this canonical line. */
  cartItemRefs: Array<{ variantId: string; quantity: number }>;
  productId: string;
  productSlug: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  stockQuantity: number;
  unitAmountCents: number;
  lineTotalCents: number;
  currency: "USD";
  configuration: ProductConfiguration;
};

export type CheckoutQuote = {
  items: CheckoutQuoteLine[];
  subtotalCents: number;
  shippingMethod: "standard" | "express";
  shippingCents: number;
  shippingEstimate: string;
  discountCode: string | null;
  discountCents: number;
  discountError: string | null;
  totalCents: number;
  currency: "USD";
  isDemoCatalog: boolean;
};

export class CheckoutQuoteError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "CheckoutQuoteError";
  }
}

type DiscountRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  amount: number;
  minimum_subtotal_cents: number;
  maximum_discount_cents: number | null;
  starts_at: string | null;
  expires_at: string | null;
  available: boolean;
};

function configuredCatalog() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function resolveProductConfiguration(product: CatalogProduct, input?: ProductConfiguration) {
  const colors = product.colors.length ? product.colors : [{ name: "Original", hex: "#a9a79e" }];
  const colorIndex = input ? colors.findIndex((color) => color.name === input.colorName && color.hex.toLowerCase() === input.colorHex.toLowerCase()) : 0;
  if (input && colorIndex < 0) throw new CheckoutQuoteError(`The selected color for ${product.name} is no longer available. Refresh your bag and try again.`);

  const materials = getStudioMaterials(product);
  const material = input ? materials.find((option) => option.label === input.material) : materials[0];
  const finish = input ? studioFinishes.find((option) => option.label === input.finish) : studioFinishes[0];
  if (!material || !finish) throw new CheckoutQuoteError(`A selected material or finish for ${product.name} is no longer available. Refresh your bag and try again.`);

  const allowedAddOns = getStudioAdditions(product).map((option) => option.id);
  const addOns = input?.addOns ?? [];
  if (new Set(addOns).size !== addOns.length || addOns.some((item) => !allowedAddOns.includes(item))) {
    throw new CheckoutQuoteError(`A selected add-on for ${product.name} is no longer available. Refresh your bag and try again.`);
  }

  let size = input?.size;
  if (product.category === "footwear") {
    size ??= "42";
    if (!["39", "40", "41", "42", "43", "44", "45"].includes(size)) throw new CheckoutQuoteError(`The selected size for ${product.name} is not available.`);
  } else if (size) {
    throw new CheckoutQuoteError(`A size was supplied for ${product.name}, which does not have size variants.`);
  }

  const configuration = buildConfiguration({
    source: input?.source ?? "product",
    product,
    colorIndex: Math.max(0, colorIndex),
    material,
    finish,
    addOns,
    size,
  });
  const matchingVariants = matchingProductVariants(product, configuration);
  if (product.variants?.some((variant) => variant.isActive) && !matchingVariants.length) {
    throw new CheckoutQuoteError(`The selected options for ${product.name} are no longer available. Refresh your bag and try again.`, 409);
  }
  if (new Set(matchingVariants.map((variant) => variant.priceAdjustmentCents)).size > 1) {
    throw new CheckoutQuoteError(`The selected variant price for ${product.name} needs administrator review.`, 409);
  }
  if (configuration.unitPriceCents < 0) throw new CheckoutQuoteError(`The configured price for ${product.name} is invalid.`, 409);
  return configuration;
}

async function findDiscount(code: string): Promise<{ row: DiscountRow | null; demo: boolean }> {
  if (!configuredCatalog()) {
    if (code.toUpperCase() === "VANTA10") {
      return { row: { id: "demo-vanta10", code: "VANTA10", discount_type: "percent", amount: 10, minimum_subtotal_cents: 5000, maximum_discount_cents: 5000, starts_at: null, expires_at: null, available: true }, demo: true };
    }
    return { row: null, demo: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_discount", { p_code: code.toUpperCase() }).maybeSingle();
  if (error) throw new CheckoutQuoteError("Discount codes could not be checked. Try again in a moment.", 503);
  return { row: data as DiscountRow | null, demo: false };
}

function discountAmount(row: DiscountRow, subtotalCents: number) {
  if (subtotalCents < row.minimum_subtotal_cents) return 0;
  const raw = row.discount_type === "percent" ? Math.round(subtotalCents * row.amount / 100) : row.amount;
  return Math.max(0, Math.min(subtotalCents, raw, row.maximum_discount_cents ?? Number.MAX_SAFE_INTEGER));
}

export async function calculateCheckoutQuote(input: CheckoutQuoteRequest): Promise<CheckoutQuote> {
  const products = new Map<string, CatalogProduct>();
  const lineMap = new Map<string, CheckoutQuoteLine>();
  let isDemoCatalog = false;

  for (const item of input.items) {
    let product = products.get(item.productSlug);
    if (!product) {
      const loaded = await getCatalogProduct(item.productSlug);
      if (loaded.error) throw new CheckoutQuoteError(loaded.error, 503);
      if (!loaded.product) throw new CheckoutQuoteError(`A product in your bag is no longer available. Remove it to continue.`, 409);
      product = loaded.product;
      products.set(product.slug, product);
    }

    const configuration = resolveProductConfiguration(product, item.configuration);
    const variantId = makeConfigurationVariantId(product.id, configuration);
    const unitAmountCents = getEffectivePrice(product) + configuration.surchargeCents;
    const stockQuantity = getConfigurationStock(product, configuration);
    const existing = lineMap.get(variantId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.lineTotalCents = existing.unitAmountCents * existing.quantity;
      existing.cartItemRefs.push({ variantId: item.variantId, quantity: item.quantity });
    } else {
      lineMap.set(variantId, {
        variantId,
        cartItemRefs: [{ variantId: item.variantId, quantity: item.quantity }],
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        imageUrl: product.images[0],
        quantity: item.quantity,
        stockQuantity,
        unitAmountCents,
        lineTotalCents: unitAmountCents * item.quantity,
        currency: product.currency,
        configuration,
      });
    }
    isDemoCatalog ||= product.isDemo;
  }

  const lines = [...lineMap.values()];
  const quantityByProduct = new Map<string, number>();
  for (const line of lines) quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) ?? 0) + line.quantity);
  for (const product of products.values()) {
    const quantity = quantityByProduct.get(product.id) ?? 0;
    if (product.stockQuantity < quantity) throw new CheckoutQuoteError(`${product.name} has ${product.stockQuantity} sample units available, but your bag has ${quantity}. Update the quantity to continue.`, 409);
  }
  for (const line of lines) {
    if (line.stockQuantity < line.quantity) {
      throw new CheckoutQuoteError(`${line.name} has ${line.stockQuantity} selected variant units available, but your bag has ${line.quantity}. Update the configuration to continue.`, 409);
    }
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const shippingMethod = input.shippingMethod;
  const shippingCents = shippingMethod === "express" ? 2800 : 1200;
  const shippingEstimate = shippingMethod === "express" ? "2–3 business days" : "5–7 business days";
  let discountCode: string | null = null;
  let discountCents = 0;
  let discountError: string | null = null;

  if (input.discountCode?.trim()) {
    const code = input.discountCode.trim().toUpperCase();
    const { row } = await findDiscount(code);
    const now = Date.now();
    if (!row || !row.available || (row.starts_at && Date.parse(row.starts_at) > now) || (row.expires_at && Date.parse(row.expires_at) <= now)) {
      discountError = "This code is invalid, expired, or has reached its redemption limit.";
    } else if (subtotalCents < row.minimum_subtotal_cents) {
      discountError = `Add ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((row.minimum_subtotal_cents - subtotalCents) / 100)} more to use ${row.code}.`;
    } else {
      discountCode = row.code;
      discountCents = discountAmount(row, subtotalCents);
    }
  }

  return {
    items: lines,
    subtotalCents,
    shippingMethod,
    shippingCents,
    shippingEstimate,
    discountCode,
    discountCents,
    discountError,
    totalCents: subtotalCents - discountCents + shippingCents,
    currency: "USD",
    isDemoCatalog,
  };
}

export function lookupCatalogConfigured() {
  return configuredCatalog();
}
