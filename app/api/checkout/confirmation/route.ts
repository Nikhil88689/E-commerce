import { NextResponse } from "next/server";
import { markCheckoutSessionFailed, markCheckoutSessionPaid } from "@/lib/checkout/fulfillment";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStripeServerClient, isStripeTestConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) return NextResponse.json({ error: "A valid Stripe test Checkout Session is required." }, { status: 400, headers: { "cache-control": "no-store" } });
  if (!isStripeTestConfigured() || !isSupabaseAdminConfigured()) return NextResponse.json({ error: "Order confirmation is not available in this environment." }, { status: 503, headers: { "cache-control": "no-store" } });

  try {
    const stripe = getStripeServerClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "payment" || !session.metadata?.order_id) return NextResponse.json({ error: "This session is not a VANTA order." }, { status: 404, headers: { "cache-control": "no-store" } });
    const admin = createSupabaseAdminClient();
    if (session.payment_status === "paid") await markCheckoutSessionPaid(admin, session);
    else if (session.status === "expired") await markCheckoutSessionFailed(admin, session);

    const { data: order, error: orderError } = await admin.from("orders").select("id,order_number,status,payment_status,total_cents,currency,shipping_method,shipping_estimate,created_at,paid_at").eq("id", session.metadata.order_id).eq("stripe_checkout_session_id", session.id).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "The order record is not available yet. Refresh in a moment." }, { status: 404, headers: { "cache-control": "no-store" } });
    const { data: items, error: itemsError } = await admin.from("order_items").select("product_name,product_slug,product_image_url,variant_id,quantity,unit_amount_cents,currency,configuration,cart_item_refs").eq("order_id", order.id).order("created_at");
    if (itemsError) throw itemsError;

    return NextResponse.json({
      confirmed: order.payment_status === "paid" && session.payment_status === "paid",
      paymentStatus: order.payment_status,
      sessionStatus: session.status,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalCents: order.total_cents,
        currency: order.currency,
        shippingMethod: order.shipping_method,
        shippingEstimate: order.shipping_estimate,
        createdAt: order.created_at,
        items: (items ?? []).map((item) => ({
          name: item.product_name,
          slug: item.product_slug,
          imageUrl: item.product_image_url,
          variantId: item.variant_id,
          quantity: item.quantity,
          unitAmountCents: item.unit_amount_cents,
          currency: item.currency,
          configuration: item.configuration,
          cartItemRefs: item.cart_item_refs,
        })),
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Could not verify VANTA order confirmation", error);
    return NextResponse.json({ error: "We could not verify this payment. Your bag has not been cleared." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
