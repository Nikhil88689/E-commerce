import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveConfigurationSchema } from "@/lib/validation/configuration";

function hasSupabaseConfiguration() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(request: Request) {
  if (!hasSupabaseConfiguration()) return NextResponse.json({ error: "Sign in sync is not configured; this device can keep the saved configuration." }, { status: 401 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to sync saved studio configurations." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("product");
    if (!productSlug) return NextResponse.json({ error: "A product slug is required." }, { status: 400 });
    const { data, error } = await supabase.from("saved_configurations").select("configuration").eq("user_id", user.id).eq("product_slug", productSlug).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ configuration: data?.configuration ?? null });
  } catch (error) {
    console.error("Could not load saved product configuration", error);
    return NextResponse.json({ error: "Saved configuration sync is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const parsed = saveConfigurationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The configuration is invalid." }, { status: 400 });
  if (!hasSupabaseConfiguration()) return NextResponse.json({ error: "Sign in sync is not configured; the saved configuration remains on this device." }, { status: 401 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to sync saved studio configurations." }, { status: 401 });
    const { productSlug, configuration } = parsed.data;
    const { error } = await supabase.from("saved_configurations").upsert({
      user_id: user.id,
      product_slug: productSlug,
      configuration,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,product_slug" });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Could not save product configuration", error);
    return NextResponse.json({ error: "Saved configuration sync is unavailable." }, { status: 503 });
  }
}
