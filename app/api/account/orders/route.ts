import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";

export async function GET() {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return NextResponse.json({ error: "Sign in to view your orders." }, { status: lookup.state === "anonymous" ? 401 : 503, headers: { "cache-control": "no-store" } });
  const { supabase, user } = lookup.context;
  const { data, error } = await supabase.from("orders")
    .select("id,order_number,status,fulfillment_status,payment_status,total_cents,currency,shipping_estimate,created_at,shipped_at,delivered_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Your order history could not be loaded." }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ orders: data ?? [] }, { headers: { "cache-control": "no-store" } });
}
