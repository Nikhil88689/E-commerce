import { NextResponse } from "next/server";
import { CheckoutQuoteError, calculateCheckoutQuote } from "@/lib/checkout/pricing";
import { quoteRequestSchema } from "@/lib/checkout/schemas";
import { isStripeTestConfigured } from "@/lib/stripe/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await checkPublicRateLimit(request, "quote");
  if (limit === "limited") return NextResponse.json({ error: "Too many order total checks. Wait a moment and try again." }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "600" } });
  if (limit === "unavailable") return NextResponse.json({ error: "Order totals are temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  const body = await request.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the items and quantities in your bag, then try again." }, { status: 400, headers: { "cache-control": "no-store" } });

  try {
    const quote = await calculateCheckoutQuote(parsed.data);
    return NextResponse.json({
      quote,
      paymentReady: isStripeTestConfigured() && isSupabaseAdminConfigured(),
      paymentUnavailableMessage: "Secure test checkout is not configured for this environment. No payment was attempted.",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof CheckoutQuoteError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
    console.error("Could not calculate a trusted checkout quote", error);
    return NextResponse.json({ error: "We could not update your order total. Please try again." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
