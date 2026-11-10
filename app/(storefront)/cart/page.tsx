import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";
import { getCatalogProducts } from "@/lib/catalog/service";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Your Bag", description: "Review VANTA forms, configurations, and sample delivery estimates before secure test checkout.", path: "/cart", noIndex: true });

export default async function CartRoute() {
  const result = await getCatalogProducts({ sort: "featured", pageSize: 5 });
  return <CartPage recommendations={result.products.slice(0, 4)} />;
}
