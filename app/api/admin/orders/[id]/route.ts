import { NextResponse } from "next/server";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";
import { adminFulfillmentSchema } from "@/lib/validation/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  const [order, items, payments, events] = await Promise.all([
    access.context.supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    access.context.supabase.from("order_items").select("*").eq("order_id", id),
    access.context.supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
    access.context.supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (order.error || items.error || payments.error || events.error) return adminError(new Error("Order details could not be loaded."), 500);
  if (!order.data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order: order.data, items: items.data ?? [], payment: payments.data, events: events.data ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  try {
    const input = adminFulfillmentSchema.parse(await readJson(request));
    const { data, error } = await access.context.supabase.rpc("admin_update_fulfillment", { p_order_id:id,p_status:input.fulfillmentStatus,p_carrier:input.carrier,p_tracking_number:input.trackingNumber,p_tracking_url:input.trackingUrl,p_note:input.note,p_actor:access.context.user.id });
    if (error || !data) throw new Error("Fulfillment could not be updated. Confirm the order exists and the admin migration is applied.");
    return NextResponse.json({ ok: true });
  } catch (error) { return adminError(error); }
}

