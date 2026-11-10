import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

function paymentIntentId(value: Stripe.Checkout.Session["payment_intent"]) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function recordFailedPayment(admin: SupabaseClient, record: Record<string, unknown>) {
  const { data, error } = await admin.from("payments").update(record)
    .eq("order_id", String(record.order_id)).neq("status", "succeeded").neq("status", "refunded")
    .select("id").maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await admin.from("payments").upsert(record, { onConflict: "order_id", ignoreDuplicates: true });
  if (insertError) throw insertError;
}

export async function markCheckoutSessionPaid(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId || session.mode !== "payment" || session.payment_status !== "paid") return false;
  const { data: order, error: readError } = await admin.from("orders").select("id,status,payment_status,discount_code,stripe_checkout_session_id,total_cents,currency,order_number,cart_id").eq("id", orderId).maybeSingle();
  if (readError) throw readError;
  if (!order) throw new Error("The paid Stripe session has no matching VANTA order.");
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) throw new Error("The Stripe session does not match the pending VANTA order.");
  if (session.amount_total !== order.total_cents || session.currency?.toUpperCase() !== order.currency || session.metadata?.order_number !== order.order_number) {
    throw new Error("The paid Stripe total or currency does not match the VANTA order.");
  }

  const { data: inventoryCommitted, error: inventoryError } = await admin.rpc("commit_order_inventory", { p_order_id: orderId });
  if (inventoryError) throw inventoryError;
  if (!inventoryCommitted) throw new Error("The paid order has no valid stock reservation. Manual fulfillment review is required.");

  const paidAt = new Date().toISOString();
  const { error: orderError } = await admin.from("orders").update({
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId(session.payment_intent),
    status: "processing",
    payment_status: "paid",
    paid_at: paidAt,
    updated_at: paidAt,
  }).eq("id", orderId);
  if (orderError) throw orderError;

  const { error: paymentError } = await admin.from("payments").upsert({
    order_id: orderId,
    provider: "stripe",
    status: "succeeded",
    amount_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "usd").toUpperCase(),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId(session.payment_intent),
    updated_at: paidAt,
  }, { onConflict: "order_id" });
  if (paymentError) throw paymentError;

  if (order.discount_code) {
    const { data: discountRedeemed, error: discountError } = await admin.rpc("redeem_discount_for_order", { p_code: order.discount_code, p_order_id: orderId });
    if (discountError) throw discountError;
    if (!discountRedeemed) throw new Error("The paid order discount could not be finalized. Manual payment review is required.");
  }
  if (order.cart_id) {
    const { data: purchasedItems, error: itemsError } = await admin.from("order_items").select("cart_item_refs").eq("order_id", orderId);
    if (itemsError) throw itemsError;
    const refs = (purchasedItems ?? []).flatMap((item) => Array.isArray(item.cart_item_refs) ? item.cart_item_refs : []);
    const { data: cartCleared, error: cartError } = await admin.rpc("remove_purchased_cart_items", { p_order_id: orderId, p_cart_id: order.cart_id, p_refs: refs });
    if (cartError) throw cartError;
    if (!cartCleared) throw new Error("The confirmed order could not be removed from the saved bag.");
  }
  return true;
}

export async function markCheckoutSessionFailed(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return false;
  const { data: order, error: readError } = await admin.from("orders").select("id,payment_status,stripe_checkout_session_id").eq("id", orderId).maybeSingle();
  if (readError) throw readError;
  if (!order) return false;
  if (order.payment_status === "paid") return true;
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) throw new Error("The Stripe session does not match the pending VANTA order.");

  const now = new Date().toISOString();
  const { data: failedOrder, error: orderError } = await admin.from("orders").update({
    stripe_checkout_session_id: session.id,
    status: "cancelled",
    payment_status: "failed",
    updated_at: now,
  }).eq("id", orderId).neq("payment_status", "paid").select("id").maybeSingle();
  if (orderError) throw orderError;
  if (!failedOrder) {
    const { data: currentOrder, error: currentOrderError } = await admin.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
    if (currentOrderError) throw currentOrderError;
    if (currentOrder?.payment_status === "paid") return true;
    if (!currentOrder) return false;
  }
  await recordFailedPayment(admin, {
    order_id: orderId,
    provider: "stripe",
    status: "failed",
    amount_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "usd").toUpperCase(),
    stripe_checkout_session_id: session.id,
    updated_at: now,
  });
  const { error: inventoryReleaseError } = await admin.rpc("release_order_inventory", { p_order_id: orderId });
  if (inventoryReleaseError) throw inventoryReleaseError;
  return true;
}

export async function markPaymentIntentFailed(admin: SupabaseClient, intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.order_id;
  if (!orderId) return false;
  const { data: order, error: readError } = await admin.from("orders").select("id,payment_status").eq("id", orderId).maybeSingle();
  if (readError) throw readError;
  if (!order) return false;
  if (order.payment_status === "paid") return true;
  const now = new Date().toISOString();
  // A failed payment intent can be retried within an open Checkout session.
  // Keep both the pending order and its stock hold until Stripe expires the session.
  const { data: failedOrder, error: orderError } = await admin.from("orders").update({ payment_status: "failed", stripe_payment_intent_id: intent.id, updated_at: now }).eq("id", orderId).neq("payment_status", "paid").select("id").maybeSingle();
  if (orderError) throw orderError;
  if (!failedOrder) return true;
  await recordFailedPayment(admin, {
    order_id: orderId,
    provider: "stripe",
    status: "failed",
    amount_cents: intent.amount,
    currency: intent.currency.toUpperCase(),
    stripe_payment_intent_id: intent.id,
    failure_code: intent.last_payment_error?.code ?? null,
    updated_at: now,
  });
  return true;
}
