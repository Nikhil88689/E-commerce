import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkoutItemSchema } from "@/lib/checkout/schemas";
import { CheckoutQuoteError, resolveProductConfiguration } from "@/lib/checkout/pricing";
import { getCatalogProduct } from "@/lib/catalog/service";
import { makeConfigurationVariantId, type ProductConfiguration } from "@/lib/catalog/configuration";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const cartSyncSchema = z.object({
  items: z.array(checkoutItemSchema).max(40),
  savedItems: z.array(checkoutItemSchema).max(40),
});

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

async function authenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user?.id ?? null;
}

async function cartOwner() {
  const userId = await authenticatedUserId();
  if (userId) return { userId, guestToken: null as string | null, setGuestCookie: false };
  const cookieStore = await cookies();
  const priorToken = cookieStore.get("vanta_cart")?.value;
  const guestToken = priorToken && /^[a-f0-9]{64}$/.test(priorToken) ? priorToken : randomBytes(32).toString("hex");
  return { userId: null, guestToken, setGuestCookie: guestToken !== priorToken };
}

function guestTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setGuestCookie(response: NextResponse, owner: Awaited<ReturnType<typeof cartOwner>>) {
  if (owner.guestToken && owner.setGuestCookie) {
    response.cookies.set("vanta_cart", owner.guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

async function normalizeRows(rows: Array<z.infer<typeof checkoutItemSchema>>, saved: boolean) {
  const normalized = new Map<string, {
    product_id: string;
    product_slug: string;
    variant_id: string;
    quantity: number;
    configuration: ProductConfiguration;
    is_saved: boolean;
    name: string;
    imageUrl?: string;
    unitAmount: number;
    currency: string;
  }>();

  for (const row of rows) {
    const loaded = await getCatalogProduct(row.productSlug);
    if (loaded.error) throw new CheckoutQuoteError(loaded.error, 503);
    if (!loaded.product) throw new CheckoutQuoteError("A product in your saved bag is no longer available. Refresh your bag.", 409);
    const configuration = resolveProductConfiguration(loaded.product, row.configuration);
    const variantId = makeConfigurationVariantId(loaded.product.id, configuration);
    const existing = normalized.get(variantId);
    if (existing) {
      existing.quantity += row.quantity;
      if (existing.quantity > 50) throw new CheckoutQuoteError(`Keep ${loaded.product.name} at 50 or fewer units in your bag.`);
      continue;
    }
    normalized.set(variantId, {
      product_id: loaded.product.id,
      product_slug: loaded.product.slug,
      variant_id: variantId,
      quantity: row.quantity,
      configuration,
      is_saved: saved,
      name: loaded.product.name,
      imageUrl: loaded.product.images[0],
      unitAmount: configuration.unitPriceCents,
      currency: loaded.product.currency,
    });
  }
  return normalized;
}

function toClientItems(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const configuration = row.configuration as ProductConfiguration;
    return {
      productId: String(row.product_id ?? ""),
      variantId: String(row.variant_id),
      slug: String(row.product_slug),
      name: String(row.product_name ?? "VANTA form"),
      unitAmount: Number(configuration?.unitPriceCents ?? 0),
      currency: "USD",
      imageUrl: typeof row.image_url === "string" ? row.image_url : undefined,
      configuration,
      quantity: Number(row.quantity),
    };
  });
}

export async function GET(request: Request) {
  const limit = await checkPublicRateLimit(request, "cart");
  if (limit === "limited") return fail("Your bag is being requested too often. Try again shortly.", 429);
  if (limit === "unavailable") return fail("Customer bag sync is temporarily unavailable.", 503);
  if (!isSupabaseAdminConfigured()) return fail("Customer bag sync is not configured.", 503);
  try {
    const owner = await cartOwner();
    const admin = createSupabaseAdminClient();
    let cartQuery = admin.from("carts").select("id");
    cartQuery = owner.userId ? cartQuery.eq("user_id", owner.userId) : cartQuery.eq("guest_token_hash", guestTokenHash(owner.guestToken!));
    const { data: cart, error: cartError } = await cartQuery.maybeSingle();
    if (cartError) throw cartError;
    if (!cart) return setGuestCookie(NextResponse.json({ items: [], savedItems: [] }, { headers: { "cache-control": "no-store" } }), owner);

    const { data: rows, error: rowsError } = await admin.from("cart_items")
      .select("product_slug,variant_id,quantity,configuration,is_saved")
      .eq("cart_id", cart.id);
    if (rowsError) throw rowsError;
    const activeInputs: Array<z.infer<typeof checkoutItemSchema>> = [];
    const savedInputs: Array<z.infer<typeof checkoutItemSchema>> = [];
    for (const row of rows ?? []) {
      const entry = { variantId: String(row.variant_id), productSlug: String(row.product_slug), quantity: Number(row.quantity), configuration: row.configuration as ProductConfiguration };
      (row.is_saved ? savedInputs : activeInputs).push(entry);
    }
    const active = await normalizeRows(activeInputs, false);
    const saved = await normalizeRows(savedInputs, true);
    for (const variantId of active.keys()) saved.delete(variantId);
    const hydratedRows = async (entries: typeof active) => Promise.all([...entries.values()].map(async (entry) => {
      const product = await getCatalogProduct(entry.product_slug);
      return { ...entry, product_name: entry.name, image_url: product.product?.images[0] };
    }));
    return setGuestCookie(NextResponse.json({ items: toClientItems(await hydratedRows(active)), savedItems: toClientItems(await hydratedRows(saved)) }, { headers: { "cache-control": "no-store" } }), owner);
  } catch (error) {
    if (error instanceof CheckoutQuoteError) return fail(error.message, error.status);
    console.error("Could not read customer bag", error);
    return fail("Customer bag could not be loaded.", 503);
  }
}

export async function PUT(request: Request) {
  const limit = await checkPublicRateLimit(request, "cart");
  if (limit === "limited") return fail("Your bag is being updated too often. Wait a moment and try again.", 429);
  if (limit === "unavailable") return fail("Customer bag sync is temporarily unavailable.", 503);
  const parsed = cartSyncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("The bag contains details we could not save.", 400);
  if (!isSupabaseAdminConfigured()) return fail("Customer bag sync is not configured.", 503);
  try {
    const owner = await cartOwner();
    const active = await normalizeRows(parsed.data.items, false);
    const saved = await normalizeRows(parsed.data.savedItems, true);
    for (const variantId of active.keys()) saved.delete(variantId);

    const admin = createSupabaseAdminClient();
    const timestamp = new Date().toISOString();
    const cartResult = owner.userId
      ? await admin.from("carts").upsert({ user_id: owner.userId, guest_token_hash: null, currency: "USD", updated_at: timestamp }, { onConflict: "user_id" }).select("id").single()
      : await admin.from("carts").upsert({ user_id: null, guest_token_hash: guestTokenHash(owner.guestToken!), currency: "USD", updated_at: timestamp }, { onConflict: "guest_token_hash" }).select("id").single();
    const { data: cart, error: cartError } = cartResult;
    if (cartError || !cart) throw cartError ?? new Error("Customer bag could not be created.");
    const databaseRows = [...active.values(), ...saved.values()].map((row) => ({
      product_id: row.product_id,
      product_slug: row.product_slug,
      variant_id: row.variant_id,
      quantity: row.quantity,
      configuration: row.configuration,
      is_saved: row.is_saved,
      updated_at: new Date().toISOString(),
    }));
    const { error: replaceError } = await admin.rpc("replace_cart_items", { p_cart_id: cart.id, p_items: databaseRows });
    if (replaceError) throw replaceError;
    const toRows = async (entries: typeof active) => Promise.all([...entries.values()].map(async (entry) => {
      const product = await getCatalogProduct(entry.product_slug);
      return { ...entry, product_name: entry.name, image_url: product.product?.images[0] };
    }));
    return setGuestCookie(NextResponse.json({ items: toClientItems(await toRows(active)), savedItems: toClientItems(await toRows(saved)) }, { headers: { "cache-control": "no-store" } }), owner);
  } catch (error) {
    if (error instanceof CheckoutQuoteError) return fail(error.message, error.status);
    console.error("Could not save customer bag", error);
    return fail("Customer bag could not be saved. Your local bag is still available.", 503);
  }
}
