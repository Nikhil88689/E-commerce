import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkoutSessionRequestSchema } from "@/lib/checkout/schemas";
import { CheckoutQuoteError, calculateCheckoutQuote } from "@/lib/checkout/pricing";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient, isStripeTestConfigured } from "@/lib/stripe/server";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function retryableErrorResponse(message: string) {
  return NextResponse.json({ error: message, retryable: true }, { status: 409, headers: { "cache-control": "no-store" } });
}

function orderFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function findAuthenticatedUserId() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    return error ? null : user?.id ?? null;
  } catch { return null; }
}

async function findOwnedCartId(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string | null) {
  let query = admin.from("carts").select("id");
  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    const token = (await cookies()).get("vanta_cart")?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    query = query.eq("guest_token_hash", createHash("sha256").update(token).digest("hex"));
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function POST(request: Request) {
  const limit = await checkPublicRateLimit(request, "checkout");
  if (limit === "limited") return NextResponse.json({ error: "Too many checkout attempts. Wait a few minutes and try again." }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "600" } });
  if (limit === "unavailable") return errorResponse("Secure checkout is temporarily unavailable. Please try again shortly.", 503);
  const parsed = checkoutSessionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Check your contact, delivery address, and order details.", 400);
  if (!isStripeTestConfigured()) return errorResponse("Stripe test keys and a webhook signing secret are required. No payment was attempted.", 503);
  if (!isSupabaseAdminConfigured()) return errorResponse("Supabase service credentials are required to create a protected order. No payment was attempted.", 503);

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let siteUrl: URL;
  let cleanupOrderId: string | null = null;
  let stripeSessionCreated = false;
  let checkoutAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    siteUrl = new URL(configuredSiteUrl ?? request.url);
    if (process.env.NODE_ENV === "production" && (!configuredSiteUrl || siteUrl.protocol !== "https:")) return errorResponse("Set NEXT_PUBLIC_SITE_URL to the HTTPS VANTA storefront URL before enabling checkout.", 503);
  } catch { return errorResponse("The storefront URL is not configured correctly.", 503); }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try { if (new URL(originHeader).origin !== siteUrl.origin) return errorResponse("Checkout requests must come from this storefront.", 403); }
    catch { return errorResponse("Checkout request origin is invalid.", 403); }
  }

  const input = parsed.data;
  try {
    const quote = await calculateCheckoutQuote(input);
    if (quote.discountError) return errorResponse(quote.discountError, 400);

    const fingerprint = orderFingerprint({
      items: quote.items.map((line) => ({ variantId: line.variantId, quantity: line.quantity, unitAmountCents: line.unitAmountCents, configuration: line.configuration, cartItemRefs: line.cartItemRefs })),
      contact: input.contact,
      address: input.address,
      shippingMethod: quote.shippingMethod,
      discountCode: quote.discountCode,
      totalCents: quote.totalCents,
    });
    const admin = createSupabaseAdminClient();
    checkoutAdmin = admin;
    const stripe = getStripeServerClient();
    let discountId: string | null = null;
    if (quote.discountCode) {
      const { data: discount, error: discountError } = await admin.from("discounts").select("id,active,usage_limit,usage_count,starts_at,expires_at").eq("code", quote.discountCode).maybeSingle();
      if (discountError) throw discountError;
      const now = Date.now();
      if (!discount?.active || (discount.usage_limit !== null && discount.usage_count >= discount.usage_limit) || (discount.starts_at && Date.parse(discount.starts_at) > now) || (discount.expires_at && Date.parse(discount.expires_at) <= now)) return errorResponse("This discount is no longer available. Update your bag and try again.", 409);
      discountId = discount.id;
    }
    const idempotencyKey = input.idempotencyKey;
    const { data: priorOrder, error: lookupError } = await admin.from("orders").select("id,order_number,idempotency_key,request_fingerprint,stripe_checkout_session_id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (lookupError) throw lookupError;

    let orderId: string;
    let orderNumber: string;
    let userId: string | null = null;
    if (priorOrder) {
      if (priorOrder.request_fingerprint !== fingerprint) return errorResponse("This checkout attempt changed. Return to review and start a new secure session.", 409);
      if (priorOrder.status === "processing" || priorOrder.status === "shipped" || priorOrder.status === "delivered") return errorResponse("This order is already confirmed. Check your order confirmation before trying again.", 409);
      orderId = priorOrder.id;
      orderNumber = priorOrder.order_number;
      if (priorOrder.stripe_checkout_session_id) {
        const priorSession = await stripe.checkout.sessions.retrieve(priorOrder.stripe_checkout_session_id);
        if (priorSession.status === "open" && priorSession.url) return NextResponse.json({ url: priorSession.url, orderNumber }, { headers: { "cache-control": "no-store" } });
        return retryableErrorResponse("This payment session has ended. A new secure session can be created.");
      }
    } else {
      orderId = crypto.randomUUID();
      orderNumber = `VNT-${orderId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      userId = await findAuthenticatedUserId();
      const cartId = await findOwnedCartId(admin, userId);
      const orderRecord = {
        id: orderId,
        order_number: orderNumber,
        idempotency_key: idempotencyKey,
        request_fingerprint: fingerprint,
        user_id: userId,
        cart_id: cartId,
        email: input.contact.email,
        phone: input.contact.phone || null,
        currency: quote.currency,
        status: "pending",
        payment_status: "pending",
        subtotal_cents: quote.subtotalCents,
        shipping_cents: quote.shippingCents,
        tax_cents: 0,
        discount_cents: quote.discountCents,
        discount_id: discountId,
        total_cents: quote.totalCents,
        discount_code: quote.discountCode,
        shipping_method: quote.shippingMethod,
        shipping_estimate: quote.shippingEstimate,
        shipping_address: { ...input.address, recipient: input.contact.fullName },
      };
      const { error: insertError } = await admin.from("orders").insert(orderRecord);
      if (insertError) {
        const { data: racedOrder, error: raceLookupError } = await admin.from("orders").select("id,order_number,idempotency_key,request_fingerprint,stripe_checkout_session_id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
        if (raceLookupError || !racedOrder) throw insertError;
        if (racedOrder.request_fingerprint !== fingerprint) return errorResponse("This checkout attempt changed. Return to review and start a new secure session.", 409);
        orderId = racedOrder.id;
        orderNumber = racedOrder.order_number;
      }
    }

    const orderLines = quote.items.map((line) => ({
      order_id: orderId,
      product_id: line.productId,
      product_slug: line.productSlug,
      product_name: line.name,
      product_image_url: line.imageUrl ?? null,
      variant_id: line.variantId,
      quantity: line.quantity,
      unit_amount_cents: line.unitAmountCents,
      currency: line.currency,
      configuration: line.configuration,
      cart_item_refs: line.cartItemRefs,
    }));
    const { error: lineError } = await admin.from("order_items").upsert(orderLines, { onConflict: "order_id,variant_id" });
    if (lineError) throw lineError;
    cleanupOrderId = orderId;

    const { data: stockReserved, error: stockError } = await admin.rpc("reserve_order_inventory", { p_order_id: orderId });
    if (stockError) {
      if (stockError.code === "23514") {
        await admin.rpc("release_order_inventory", { p_order_id: orderId });
        cleanupOrderId = null;
        return errorResponse("One or more selected products or variants no longer have enough stock. Update your bag and try again.", 409);
      }
      throw stockError;
    }
    if (!stockReserved) {
      await admin.rpc("release_order_inventory", { p_order_id: orderId });
      cleanupOrderId = null;
      return errorResponse("One or more selected products or variants no longer have enough stock. Update your bag and try again.", 409);
    }

    if (quote.discountCode) {
      const { data: discountReserved, error: reserveDiscountError } = await admin.rpc("reserve_discount_for_order", { p_code: quote.discountCode, p_order_id: orderId });
      if (reserveDiscountError) throw reserveDiscountError;
      if (!discountReserved) {
        await admin.rpc("release_order_inventory", { p_order_id: orderId });
        cleanupOrderId = null;
        return errorResponse("This discount has just reached its redemption limit. Update your bag and try again.", 409);
      }
    }

    if (userId) {
      const addressHash = createHash("sha256").update(JSON.stringify({ userId, ...input.address })).digest("hex");
      const { error: addressError } = await admin.from("addresses").upsert({
        user_id: userId, recipient: input.contact.fullName,
        line1: input.address.line1, line2: input.address.line2 || null, city: input.address.city,
        region: input.address.region, postal_code: input.address.postalCode,
        country_code: input.address.countryCode, address_hash: addressHash, is_default: false,
      }, { onConflict: "user_id,address_hash" });
      if (addressError) throw addressError;
    }

    let couponId: string | undefined;
    if (quote.discountCode && quote.discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: quote.discountCents,
        currency: quote.currency.toLowerCase(),
        duration: "once",
        name: `${quote.discountCode} / VANTA checkout`,
        metadata: { order_id: orderId },
      }, { idempotencyKey: `vanta-coupon-${orderId}` });
      couponId = coupon.id;
    }

    const minimumDays = quote.shippingMethod === "express" ? 2 : 5;
    const maximumDays = quote.shippingMethod === "express" ? 3 : 7;
    // Once the Stripe request starts, its outcome can be ambiguous if the
    // connection drops. Keep the temporary hold until webhook expiry/retry.
    stripeSessionCreated = true;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: input.contact.email,
      customer_creation: "always",
      client_reference_id: orderNumber,
      line_items: quote.items.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: line.currency.toLowerCase(),
          unit_amount: line.unitAmountCents,
          product_data: {
            name: line.name,
            description: line.configuration.summary.slice(0, 500),
          },
        },
      })),
      shipping_options: [{ shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: quote.shippingCents, currency: quote.currency.toLowerCase() },
        display_name: quote.shippingMethod === "express" ? "Express delivery" : "Standard delivery",
        delivery_estimate: { minimum: { unit: "business_day", value: minimumDays }, maximum: { unit: "business_day", value: maximumDays } },
      } }],
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      billing_address_collection: "auto",
      metadata: { order_id: orderId, order_number: orderNumber },
      payment_intent_data: { metadata: { order_id: orderId, order_number: orderNumber } },
      success_url: new URL(`/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`, siteUrl).toString(),
      cancel_url: new URL(quote.discountCode ? `/checkout?cancelled=1&discount=${encodeURIComponent(quote.discountCode)}` : "/checkout?cancelled=1", siteUrl).toString(),
      submit_type: "pay",
    }, { idempotencyKey: `vanta-checkout-session-${orderId}` });

    if (!session.url) throw new Error("Stripe did not return a hosted Checkout URL.");
    const { error: orderUpdateError } = await admin.from("orders").update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", orderId);
    if (orderUpdateError) throw orderUpdateError;
    const { error: paymentError } = await admin.from("payments").upsert({
      order_id: orderId,
      provider: "stripe",
      status: "pending",
      amount_cents: quote.totalCents,
      currency: quote.currency,
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "order_id", ignoreDuplicates: true });
    if (paymentError) throw paymentError;

    cleanupOrderId = null;
    return NextResponse.json({ url: session.url, orderNumber }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (cleanupOrderId && !stripeSessionCreated && checkoutAdmin) {
      const { error: releaseError } = await checkoutAdmin.rpc("release_order_inventory", { p_order_id: cleanupOrderId });
      if (releaseError) console.error("Could not release checkout inventory hold", releaseError);
    }
    if (error instanceof CheckoutQuoteError) return errorResponse(error.message, error.status);
    console.error("Could not create Stripe test checkout session", error);
    return errorResponse("Secure test checkout could not be created. No payment was attempted; your bag is unchanged.", 503);
  }
}
