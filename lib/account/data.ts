import { requireCustomer } from "@/lib/auth/customer";
import { getCatalogProduct } from "@/lib/catalog/service";

export async function getCustomerDashboardData() {
  const { supabase, user } = await requireCustomer("/account");
  const [profileResult, ordersResult, wishlistResult, configurationResult] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,email_marketing,order_updates").eq("user_id", user.id).maybeSingle(),
    supabase.from("orders").select("id,order_number,status,fulfillment_status,payment_status,total_cents,currency,shipping_estimate,created_at,shipped_at,delivered_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("wishlist_items").select("product_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("saved_configurations").select("product_slug,configuration,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(8),
  ]);
  if (profileResult.error || ordersResult.error || wishlistResult.error || configurationResult.error) throw new Error("Your customer account could not be loaded.");

  const wishlist = await Promise.all((wishlistResult.data ?? []).slice(0, 4).map(async (item) => {
    const result = await getCatalogProduct(item.product_slug);
    return result.product;
  }));
  const savedConfigurations = await Promise.all((configurationResult.data ?? []).map(async (item) => {
    const result = await getCatalogProduct(item.product_slug);
    return { product: result.product, configuration: item.configuration as { summary?: string }, updatedAt: item.updated_at };
  }));

  return {
    user,
    profile: {
      fullName: profileResult.data?.full_name || user.user_metadata.full_name || "",
      phone: profileResult.data?.phone ?? "",
      emailMarketing: profileResult.data?.email_marketing ?? false,
      orderUpdates: profileResult.data?.order_updates ?? true,
    },
    orders: ordersResult.data ?? [],
    wishlist: wishlist.filter((item): item is NonNullable<typeof item> => !!item),
    configurations: savedConfigurations.filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => !!item.product),
  };
}

export async function getCustomerOrders() {
  const { supabase, user } = await requireCustomer("/account/orders");
  const { data, error } = await supabase.from("orders").select("id,order_number,status,fulfillment_status,payment_status,total_cents,currency,shipping_estimate,created_at,shipped_at,delivered_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Your order history could not be loaded.");
  return { user, orders: data ?? [] };
}

export async function getCustomerWishlist() {
  const { supabase, user } = await requireCustomer("/account/wishlist");
  const { data, error } = await supabase.from("wishlist_items").select("product_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) throw new Error("Your wishlist could not be loaded.");
  const products = await Promise.all((data ?? []).map(async (item) => {
    const result = await getCatalogProduct(item.product_slug);
    return result.product;
  }));
  return { user, products: products.filter((item): item is NonNullable<typeof item> => !!item) };
}
