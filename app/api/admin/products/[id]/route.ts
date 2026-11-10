import { NextResponse } from "next/server";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";
import { adminProductSchema } from "@/lib/validation/admin";

function productRow(value: ReturnType<typeof adminProductSchema.parse>) {
  return { slug:value.slug,name:value.name,description:value.description,story:value.story,category_slug:value.categorySlug,images:value.images,image_alt:value.imageAlt,materials:value.materials,colors:value.colors.map((color)=>color.name),color_swatches:value.colors,price_cents:value.priceCents,sale_price_cents:value.salePriceCents,stock_quantity:value.stockQuantity,collection_slug:value.collectionSlug,collection_name:value.collectionName,is_published:value.isPublished,is_featured:value.isFeatured,featured_rank:value.featuredRank,model_url:value.modelUrl,updated_at:new Date().toISOString() };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  const { data, error } = await access.context.supabase.from("products").select("*,product_variants(*)").eq("id", id).maybeSingle();
  if (error) return adminError(new Error("Product could not be loaded."), 500);
  if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  try {
    const input = adminProductSchema.parse(await readJson(request));
    const variants = input.variants.map((variant) => ({ ...(variant.id ? { id:variant.id } : {}),sku:variant.sku,name:variant.name,options:variant.options,price_adjustment_cents:variant.priceAdjustmentCents,stock_quantity:variant.stockQuantity,is_active:variant.isActive,sort_order:variant.sortOrder }));
    const { data: updatedId, error } = await access.context.supabase.rpc("admin_save_product", { p_id:id,p_product:productRow(input),p_variants:variants,p_actor:access.context.user.id });
    if (error || !updatedId) throw new Error(error?.code === "23505" ? "A product or variant SKU already exists." : "Product could not be saved. Confirm each existing variant belongs to this product.");
    return NextResponse.json({ ok: true });
  } catch (error) { return adminError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  const { error } = await access.context.supabase.from("products").delete().eq("id", id);
  if (error) return adminError(new Error("Product could not be deleted. It may be referenced by an order or collection."));
  return NextResponse.json({ ok: true });
}

