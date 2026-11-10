import type { CatalogProduct } from "@/lib/catalog/types";

export type StudioFinish = { id: string; label: string; surchargeCents: number; roughness: number };
export type StudioMaterial = { id: string; label: string; surchargeCents: number; metalness: number; roughness: number };
export type StudioAddition = { id: string; label: string; surchargeCents: number };

export type ProductConfiguration = {
  source: "product" | "studio";
  colorName: string;
  colorHex: string;
  material: string;
  finish: string;
  size?: string;
  addOns: string[];
  surchargeCents: number;
  unitPriceCents: number;
  summary: string;
};

export function matchingProductVariants(product: CatalogProduct, configuration: Pick<ProductConfiguration, "colorName" | "material" | "finish" | "size">) {
  const variants = product.variants?.filter((variant) => variant.isActive) ?? [];
  if (!variants.length) return [];
  return variants.filter((variant) => Object.entries(variant.options).every(([key, value]) => {
    const expected = ({
      color: configuration.colorName,
      colour: configuration.colorName,
      size: configuration.size ?? "One size",
      material: configuration.material,
      finish: configuration.finish,
    } as Record<string, string>)[key.toLowerCase()];
    return expected !== undefined && value.trim().toLowerCase() === expected.trim().toLowerCase();
  }));
}

export function getConfigurationStock(product: CatalogProduct, configuration: ProductConfiguration) {
  if (!product.variants?.some((variant) => variant.isActive)) return product.stockQuantity;
  return matchingProductVariants(product, configuration).reduce((sum, variant) => sum + variant.stockQuantity, 0);
}

export function getStudioMaterials(product: CatalogProduct): StudioMaterial[] {
  const primary = product.materials[0] ?? "Sculpted composite";
  const secondary = product.category === "footwear" ? "Recycled knit" : "Anodized aluminum";
  const isSoft = product.category === "footwear";
  return [
    { id: "primary", label: primary, surchargeCents: 0, metalness: isSoft ? 0.04 : 0.68, roughness: isSoft ? 0.82 : 0.48 },
    { id: "anodized", label: secondary, surchargeCents: 1800, metalness: isSoft ? 0.02 : 0.82, roughness: isSoft ? 0.77 : 0.31 },
    { id: "ceramic", label: "Ceramic composite", surchargeCents: 4200, metalness: 0.24, roughness: 0.28 },
  ];
}

export const studioFinishes: StudioFinish[] = [
  { id: "brushed", label: "Brushed", surchargeCents: 0, roughness: 0.46 },
  { id: "satin", label: "Satin", surchargeCents: 0, roughness: 0.29 },
  { id: "polished", label: "Polished", surchargeCents: 2200, roughness: 0.13 },
];

const additionsByCategory: Record<CatalogProduct["category"], StudioAddition[]> = {
  objects: [
    { id: "plinth", label: "Display plinth", surchargeCents: 6800 },
    { id: "care-kit", label: "Material care kit", surchargeCents: 1200 },
  ],
  audio: [
    { id: "isolation-stand", label: "Isolation stand", surchargeCents: 7400 },
    { id: "cable-set", label: "Braided cable set", surchargeCents: 2800 },
  ],
  footwear: [
    { id: "lace-set", label: "Alternate lace set", surchargeCents: 1400 },
    { id: "travel-shell", label: "Travel shell", surchargeCents: 3600 },
  ],
  living: [
    { id: "dimmer", label: "Warm dimmer", surchargeCents: 3200 },
    { id: "mount", label: "Wall mount", surchargeCents: 1900 },
  ],
  accessories: [
    { id: "travel-case", label: "Travel case", surchargeCents: 3400 },
    { id: "alternate-strap", label: "Alternate strap", surchargeCents: 4800 },
  ],
};

export function getStudioAdditions(product: CatalogProduct) {
  return additionsByCategory[product.category];
}

export function getEffectivePrice(product: CatalogProduct) {
  return product.salePriceCents ?? product.priceCents;
}

export function buildConfiguration({
  source,
  product,
  colorIndex,
  material,
  finish,
  addOns,
  size,
}: {
  source: ProductConfiguration["source"];
  product: CatalogProduct;
  colorIndex: number;
  material: StudioMaterial;
  finish: StudioFinish;
  addOns: string[];
  size?: string;
}): ProductConfiguration {
  const selectedColor = product.colors[Math.min(colorIndex, product.colors.length - 1)] ?? { name: "Original", hex: "#a9a79e" };
  const addOnOptions = getStudioAdditions(product);
  const addOnCost = addOnOptions.filter((option) => addOns.includes(option.id)).reduce((total, option) => total + option.surchargeCents, 0);
  const selectedConfiguration = {
    colorName: selectedColor.name,
    material: material.label,
    finish: finish.label,
    size,
  };
  const configuredVariants = matchingProductVariants(product, selectedConfiguration);
  const variantAdjustment = configuredVariants[0]?.priceAdjustmentCents ?? 0;
  const surchargeCents = material.surchargeCents + finish.surchargeCents + addOnCost + variantAdjustment;
  const unitPriceCents = getEffectivePrice(product) + surchargeCents;
  const summary = [selectedColor.name, material.label, finish.label, size ? `Size ${size}` : "", ...addOnOptions.filter((option) => addOns.includes(option.id)).map((option) => option.label)].filter(Boolean).join(" · ");
  return { source, colorName: selectedColor.name, colorHex: selectedColor.hex, material: material.label, finish: finish.label, size, addOns, surchargeCents, unitPriceCents, summary };
}

export function makeConfigurationVariantId(productId: string, configuration: ProductConfiguration) {
  return `${productId}:${configuration.source}:${configuration.colorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${configuration.material.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${configuration.finish}:${configuration.size ?? "standard"}:${[...configuration.addOns].sort().join("-") || "none"}`;
}
