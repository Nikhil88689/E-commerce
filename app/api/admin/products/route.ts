import { NextResponse } from "next/server";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";
import { getAdminProducts } from "@/lib/admin/data";
import { adminProductSchema } from "@/lib/validation/admin";

function productRow(value: ReturnType<typeof adminProductSchema.parse>) {
  return { slug:value.slug,name:value.name,description:value.description,story:value.story,category_slug:value.categorySlug,images:value.images,image_alt:value.imageAlt,materials:value.materials,colors:value.colors.map((color)=>color.name),color_swatches:value.colors,price_cents:value.priceCents,sale_price_cents:value.salePriceCents,stock_quantity:value.stockQuantity,collection_slug:value.collectionSlug,collection_name:value.collectionName,is_published:value.isPublished,is_featured:value.isFeatured,featured_rank:value.featuredRank,model_url:value.modelUrl };
}

export async function GET() {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try { return NextResponse.json({ products: await getAdminProducts(access.context.supabase) }); }
  catch (error) { return adminError(error, 500); }
}

export async function POST(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try {
    const input = adminProductSchema.parse(await readJson(request));
    const variants = input.variants.map((variant) => ({ ...(variant.id ? { id:variant.id } : {}),sku:variant.sku,name:variant.name,options:variant.options,price_adjustment_cents:variant.priceAdjustmentCents,stock_quantity:variant.stockQuantity,is_active:variant.isActive,sort_order:variant.sortOrder }));
    const { data: productId, error } = await access.context.supabase.rpc("admin_save_product", { p_id:null,p_product:productRow(input),p_variants:variants,p_actor:access.context.user.id });
    if (error || !productId) throw new Error(error?.code === "23505" ? "A product or variant SKU already exists." : "Product could not be created. Confirm the category and collection records.");
    return NextResponse.json({ id: productId }, { status: 201 });
  } catch (error) { return adminError(error); }
}

