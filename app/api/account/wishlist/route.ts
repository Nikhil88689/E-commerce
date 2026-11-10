import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";
import { wishlistMutationSchema } from "@/lib/validation/account";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return fail("Sign in to view your wishlist.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { data, error } = await supabase.from("wishlist_items").select("product_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return fail("Your wishlist could not be loaded.", 503);
  return NextResponse.json({ items: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const parsed = wishlistMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Choose a valid product to save.", 400);
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return fail("Sign in to save products to your wishlist.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { data: product, error: productError } = await supabase.from("products").select("slug").eq("slug", parsed.data.productSlug).eq("is_published", true).maybeSingle();
  if (productError || !product) return fail("This product is not available to save.", 404);
  const { error } = await supabase.from("wishlist_items").upsert({ user_id: user.id, product_slug: product.slug }, { onConflict: "user_id,product_slug" });
  if (error) return fail("This product could not be added to your wishlist.", 503);
  return NextResponse.json({ saved: true }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request) {
  const parsed = wishlistMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Choose a valid product to remove.", 400);
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return fail("Sign in to manage your wishlist.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { error } = await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_slug", parsed.data.productSlug);
  if (error) return fail("This product could not be removed from your wishlist.", 503);
  return NextResponse.json({ removed: true }, { headers: { "cache-control": "no-store" } });
}
