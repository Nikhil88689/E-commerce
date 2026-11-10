import type { Metadata } from "next";
import { OrderDetailClient } from "@/components/account/order-detail-client";
import { requireCustomer } from "@/lib/auth/customer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Order Details",
  description: "Review a verified VANTA order and delivery estimate.",
  path: "/account/orders",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function OrderDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!query.session_id) await requireCustomer(`/account/orders/${id}`);
  return <OrderDetailClient orderId={id} sessionId={query.session_id ?? ""} />;
}
