import type { Metadata } from "next";
import { ConfirmationClient } from "@/components/checkout/confirmation-client";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Order Confirmation",
  description: "Check the secure payment status and review your VANTA order.",
  path: "/checkout/confirmation",
  noIndex: true,
});

export default async function CheckoutConfirmationPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  return <ConfirmationClient sessionId={params.session_id ?? ""} />;
}
