import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { markCheckoutSessionFailed, markCheckoutSessionPaid, markPaymentIntentFailed } from "@/lib/checkout/fulfillment";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStripeServerClient, isStripeTestConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

function response(message: string, status: number) {
  return NextResponse.json({ received: status < 400, message }, { status, headers: { "cache-control": "no-store" } });
}

async function reserveEvent(admin: ReturnType<typeof createSupabaseAdminClient>, event: Stripe.Event) {
  const { data: existing, error: readError } = await admin.from("stripe_webhook_events").select("processing_status").eq("id", event.id).maybeSingle();
  if (readError) throw readError;
  if (existing?.processing_status === "processed") return false;
  if (!existing) {
    const { error: insertError } = await admin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type, processing_status: "processing" });
    if (insertError) {
      const { data: raced, error: racedReadError } = await admin.from("stripe_webhook_events").select("processing_status").eq("id", event.id).maybeSingle();
      if (racedReadError) throw racedReadError;
      if (raced?.processing_status === "processed") return false;
      if (!raced) throw insertError;
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!isStripeTestConfigured() || !isSupabaseAdminConfigured()) return response("Webhook processing is not configured.", 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return response("Missing Stripe signature.", 400);
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return response("Webhook signing secret is not configured.", 503);

  let event: Stripe.Event;
  try {
    event = await getStripeServerClient().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return response("Webhook signature verification failed.", 400);
  }

  try {
    const admin = createSupabaseAdminClient();
    if (!(await reserveEvent(admin, event))) return response("Event already processed.", 200);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") await markCheckoutSessionPaid(admin, session);
    } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      await markCheckoutSessionFailed(admin, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "payment_intent.payment_failed") {
      await markPaymentIntentFailed(admin, event.data.object as Stripe.PaymentIntent);
    }

    const { error: processedError } = await admin.from("stripe_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", event.id);
    if (processedError) throw processedError;
    return response("Event processed.", 200);
  } catch (error) {
    console.error("Stripe webhook event processing failed", error);
    return response("Payment event processing failed and will be retried.", 500);
  }
}
