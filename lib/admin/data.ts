import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDataResult<T> =
  | { data: T; error: null }
  | { data: null; error: Error };

export async function loadAdminData<T>(loader: () => Promise<T>): Promise<AdminDataResult<T>> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("Admin data could not be loaded.") };
  }
}

export async function getAdminDashboardData(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("admin_dashboard_metrics");
  if (error || !data) throw new Error("Admin analytics could not be loaded. Apply the command center migration and check database access.");
  return data as unknown as {
    revenueCents: number;
    paidOrders: number;
    totalOrders: number;
    averageOrderValueCents: number;
    customers: number;
    inventoryAlerts: Array<{ id:string;slug:string;name:string;category_slug:string;stock_quantity:number;is_published:boolean }>;
    recentOrders: Array<{ id:string;order_number:string|null;email:string|null;total_cents:number;currency:string;fulfillment_status:string;created_at:string }>;
    trend: Array<{ date:string;revenueCents:number;orders:number }>;
    inventoryTrend: Array<{ date:string;net:number;received:number;removed:number }>;
    bestSellers: Array<{ slug:string;name:string;units:number;revenueCents:number }>;
    categorySales: Array<{ category:string;units:number;revenueCents:number }>;
    conversion: { sessions:number;checkoutSessions:number;purchases:number;purchaseRate:number } | null;
  };
}

export async function getAdminProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Products could not be loaded.");
  const products = data ?? [];
  if (!products.length) return [];
  const { data: variants, error: variantError } = await supabase.from("product_variants").select("*").in("product_id", products.map((product) => product.id)).order("sort_order");
  if (variantError) throw new Error("Product variants could not be loaded.");
  const grouped = new Map<string, typeof variants>();
  for (const variant of variants ?? []) grouped.set(variant.product_id, [...(grouped.get(variant.product_id) ?? []), variant]);
  return products.map((product) => ({ ...product, variants: grouped.get(product.id) ?? [] }));
}

export async function getAdminInventory(supabase: SupabaseClient) {
  const [productsResult, movementsResult] = await Promise.all([
    supabase.from("products").select("id,slug,name,stock_quantity,is_published").order("stock_quantity").limit(1000),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  if (productsResult.error || movementsResult.error) throw new Error("Inventory history could not be loaded.");
  const products = productsResult.data ?? [];
  const { data: variants, error } = products.length
    ? await supabase.from("product_variants").select("*").in("product_id", products.map((product) => product.id)).order("sort_order")
    : { data: [], error: null };
  if (error) throw new Error("Variant inventory could not be loaded.");
  return { products, variants: variants ?? [], movements: movementsResult.data ?? [] };
}

export async function getAdminOrders(supabase: SupabaseClient, query = "") {
  let request = supabase.from("orders").select("id,order_number,email,user_id,total_cents,currency,payment_status,fulfillment_status,shipping_estimate,created_at,updated_at,shipment_carrier,tracking_number").order("created_at", { ascending: false }).limit(500);
  if (query.trim()) request = request.or(`order_number.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw new Error("Orders could not be loaded.");
  return data ?? [];
}

export async function getAdminContent(supabase: SupabaseClient) {
  const [collections, stories, drops, sections, products] = await Promise.all([
    supabase.from("collections").select("*").order("sort_order"),
    supabase.from("stories").select("slug,title,category,dek,hero_image,is_featured,is_published,sort_order,published_at,body").order("sort_order"),
    supabase.from("drops").select("*").order("sort_order"),
    supabase.from("homepage_sections").select("*").order("sort_order"),
    supabase.from("products").select("id,slug,name,is_featured,featured_rank,is_published,stock_quantity").order("featured_rank"),
  ]);
  if (collections.error || stories.error || drops.error || sections.error || products.error) throw new Error("Editorial content could not be loaded.");
  return { collections: collections.data ?? [], stories: stories.data ?? [], drops: drops.data ?? [], sections: sections.data ?? [], products: products.data ?? [] };
}
