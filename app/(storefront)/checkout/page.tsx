import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Secure Checkout", description: "Complete VANTA checkout using the secure Stripe test payment page.", path: "/checkout", noIndex: true });

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ discount?: string; cancelled?: string }> }) {
  const params = await searchParams;
  const discount = params.discount?.trim().toUpperCase().slice(0, 40) ?? "";
  return <CheckoutFlow key={`${discount}:${params.cancelled === "1"}`} initialDiscount={discount} wasCancelled={params.cancelled === "1"} />;
}
