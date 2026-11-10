import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeTestConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return Boolean(secretKey?.startsWith("sk_test_") && process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey?.startsWith("sk_test_")) throw new Error("A Stripe test-mode secret key is required.");
  stripeClient ??= new Stripe(secretKey, { appInfo: { name: "VANTA Commerce", version: "0.1.0" } });
  return stripeClient;
}
