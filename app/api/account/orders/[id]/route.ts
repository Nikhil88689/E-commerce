import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStripeServerClient, isStripeTestConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

function unavailable(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return unavailable("A valid VANTA order is required.", 400);

  const lookup = await getCustomerContext();
  if (lookup.state === "authenticated") {
    const { supabase, user } = lookup.context;
    const { data: order, error: orderError } = await supabase.from("orders")
      .select("id,order_number,status,fulfillment_status,payment_status,total_cents,currency,shipping_method,shipping_estimate,shipping_address,created_at,paid_at,shipment_carrier,tracking_number,tracking_url,shipped_at,delivered_at,cancelled_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (orderError) return unavailable("This order could not be loaded.", 503);
    if (!order) return unavailable("This order was not found in your account.", 404);
    const [{ data: items, error: itemsError }, { data: payment, error: paymentError }] = await Promise.all([
      supabase.from("order_items").select("product_name,product_slug,product_image_url,variant_id,quantity,unit_amount_cents,currency,configuration").eq("order_id", id).order("created_at"),
      supabase.from("payments").select("provider,status,amount_cents,currency,created_at,stripe_payment_intent_id").eq("order_id", id).maybeSingle(),
    ]);
    if (itemsError || paymentError) return unavailable("Order details could not be loaded.", 503);
    return NextResponse.json({ order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      fulfillmentStatus: order.fulfillment_status,
      paymentStatus: payment?.status ?? order.payment_status,
      payment: payment ? { provider: payment.provider, status: payment.status, amountCents: payment.amount_cents, currency: payment.currency, createdAt: payment.created_at, reference: payment.stripe_payment_intent_id ? `••${payment.stripe_payment_intent_id.slice(-6)}` : null } : null,
      totalCents: order.total_cents,
      currency: order.currency,
      shippingMethod: order.shipping_method,
      shippingEstimate: order.shipping_estimate,
      shippingAddress: order.shipping_address,
      carrier: order.shipment_carrier,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      cancelledAt: order.cancelled_at,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      items: (items ?? []).map((item) => ({ name: item.product_name, slug: item.product_slug, imageUrl: item.product_image_url, variantId: item.variant_id, quantity: item.quantity, unitAmountCents: item.unit_amount_cents, currency: item.currency, configuration: item.configuration })),
    } }, { headers: { "cache-control": "no-store" } });
  }

  if (!sessionId || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) return unavailable("Sign in to view this order, or use its secure confirmation link.", lookup.state === "anonymous" ? 401 : 503);
  if (!isStripeTestConfigured() || !isSupabaseAdminConfigured()) return unavailable("Order details are not available in this environment.", 503);

  try {
    const stripeSession = await getStripeServerClient().checkout.sessions.retrieve(sessionId);
    if (stripeSession.mode !== "payment" || stripeSession.payment_status !== "paid" || stripeSession.metadata?.order_id !== id) {
      return unavailable("The payment session does not verify this order.", 404);
    }

    const admin = createSupabaseAdminClient();
    const { data: order, error: orderError } = await admin.from("orders")
      .select("id,order_number,status,fulfillment_status,payment_status,total_cents,currency,shipping_method,shipping_estimate,shipping_address,created_at,paid_at,stripe_checkout_session_id,shipment_carrier,tracking_number,tracking_url,shipped_at,delivered_at,cancelled_at")
      .eq("id", id)
      .eq("stripe_checkout_session_id", stripeSession.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.payment_status !== "paid" || stripeSession.amount_total !== order.total_cents || stripeSession.currency?.toUpperCase() !== order.currency) {
      return unavailable("The order is not available or its payment details do not match.", 404);
    }

    const { data: items, error: itemsError } = await admin.from("order_items")
      .select("product_name,product_slug,product_image_url,variant_id,quantity,unit_amount_cents,currency,configuration")
      .eq("order_id", order.id)
      .order("created_at");
    if (itemsError) throw itemsError;
    const { data: payment, error: paymentError } = await admin.from("payments").select("provider,status,amount_cents,currency,created_at,stripe_payment_intent_id").eq("order_id", order.id).maybeSingle();
    if (paymentError) throw paymentError;

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        fulfillmentStatus: order.fulfillment_status,
        paymentStatus: payment?.status ?? order.payment_status,
        payment: payment ? { provider: payment.provider, status: payment.status, amountCents: payment.amount_cents, currency: payment.currency, createdAt: payment.created_at, reference: payment.stripe_payment_intent_id ? `••${payment.stripe_payment_intent_id.slice(-6)}` : null } : null,
        totalCents: order.total_cents,
        currency: order.currency,
        shippingMethod: order.shipping_method,
        shippingEstimate: order.shipping_estimate,
        shippingAddress: order.shipping_address,
        carrier: order.shipment_carrier,
        trackingNumber: order.tracking_number,
        trackingUrl: order.tracking_url,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        cancelledAt: order.cancelled_at,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        items: (items ?? []).map((item) => ({
          name: item.product_name,
          slug: item.product_slug,
          imageUrl: item.product_image_url,
          variantId: item.variant_id,
          quantity: item.quantity,
          unitAmountCents: item.unit_amount_cents,
          currency: item.currency,
          configuration: item.configuration,
        })),
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Could not load verified VANTA order details", error);
    return unavailable("We could not load this order. Try again in a moment.", 503);
  }
}
