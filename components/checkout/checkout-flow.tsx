"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCheckoutQuote } from "@/hooks/use-checkout-quote";
import { contactDetailsSchema, deliveryAddressSchema, type ContactDetails, type DeliveryAddress } from "@/lib/checkout/schemas";
import { rhfZodResolver } from "@/lib/validation/rhf-zod-resolver";
import { useCartStore } from "@/state/cart-store";

type Step = 1 | 2 | 3 | 4 | 5;
const steps = ["Contact", "Delivery", "Shipping", "Payment", "Review"] as const;

function formatPrice(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

function readableError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error;
  return fallback;
}

async function signatureDigest(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function CheckoutFlow({ initialDiscount = "", wasCancelled = false }: { initialDiscount?: string; wasCancelled?: boolean }) {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const [step, setStep] = useState<Step>(1);
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [discountCode] = useState(initialDiscount);
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cancelled] = useState(wasCancelled);
  const idempotency = useRef<{ signature: string; key: string } | null>(null);
  const quoteState = useCheckoutQuote(items, shippingMethod, discountCode);
  const quote = quoteState.quote;
  const contactForm = useForm<ContactDetails>({ resolver: rhfZodResolver(contactDetailsSchema), mode: "onSubmit", defaultValues: { fullName: "", email: "", phone: "" } });
  const addressForm = useForm<DeliveryAddress>({ resolver: rhfZodResolver(deliveryAddressSchema), mode: "onSubmit", defaultValues: { line1: "", line2: "", city: "", region: "", postalCode: "", countryCode: "US" } });

  function toStep(next: Step) {
    setSubmitError("");
    setStep(next);
  }

  async function confirmOrder() {
    if (!contact || !address || !quote || !items.length || processing) return;
    setSubmitError("");
    setProcessing(true);
    const payloadItems = items.map((item) => ({ variantId: item.variantId, productSlug: item.slug, quantity: item.quantity, configuration: item.configuration }));
    const basePayload = { items: payloadItems, shippingMethod, discountCode: quote.discountCode ?? undefined, contact, address };
    try {
      const signature = await signatureDigest(JSON.stringify(basePayload));
      let key = idempotency.current?.signature === signature ? idempotency.current.key : "";
      if (!key) {
        try {
          const stored = JSON.parse(sessionStorage.getItem("vanta-checkout-idempotency") ?? "null") as { signature?: string; key?: string } | null;
          if (stored?.signature === signature && stored.key) key = stored.key;
        } catch { /* A fresh operation key is enough when session storage is unavailable. */ }
      }
      if (!key) key = crypto.randomUUID();
      idempotency.current = { signature, key };

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try { sessionStorage.setItem("vanta-checkout-idempotency", JSON.stringify({ signature, key })); } catch { /* The server still protects this in-memory attempt. */ }
        const response = await fetch("/api/checkout/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...basePayload, idempotencyKey: key }) });
        const result = await response.json() as { url?: string; error?: string; retryable?: boolean };
        if (!response.ok && result.retryable && attempt === 0) {
          key = crypto.randomUUID();
          idempotency.current = { signature, key };
          continue;
        }
        if (!response.ok || !result.url) throw new Error(readableError(result, "Secure checkout could not be started. No payment was attempted."));
        window.location.assign(result.url);
        return;
      }
      throw new Error("Secure checkout could not be started. No payment was attempted.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Secure checkout could not be started. No payment was attempted.");
      setProcessing(false);
    }
  }

  if (!hydrated) return <main id="main-content" className="checkout-flow"><div className="checkout-flow__loading"><span className="studio-loader" /><p>Preparing secure checkout</p></div></main>;
  if (!items.length) return <main id="main-content" className="checkout-flow"><div className="checkout-flow__empty"><p className="eyebrow">Checkout / Nothing to review</p><h1>Your bag is open.</h1><p>Add a form to the bag before starting checkout.</p><Link className="button button--outline" href="/discover">Explore the archive <ArrowRight size={15} aria-hidden="true" /></Link></div></main>;

  return <main id="main-content" className="checkout-flow">
    <div className="checkout-flow__top"><Link href="/cart"><ArrowLeft size={14} aria-hidden="true" /> Back to bag</Link><span>VANTA / SECURE TEST CHECKOUT</span><span className="checkout-flow__secure"><LockKeyhole size={12} aria-hidden="true" /> STRIPE TEST MODE</span></div>
    <header className="checkout-flow__heading"><p className="eyebrow">A considered purchase / 0{step} of 05</p><h1>Almost<br /><em>yours.</em></h1><p>Review each detail before you continue to Stripe’s secure test payment page.</p></header>
    {cancelled ? <div className="checkout-flow__cancelled" role="status"><span />The last payment attempt was cancelled. Your bag is still here; you can review or retry below.</div> : null}
    <nav className="checkout-progress" aria-label="Checkout steps">
      {steps.map((label, index) => { const number = (index + 1) as Step; return <button key={label} type="button" className={step === number ? "is-current" : step > number ? "is-complete" : ""} aria-current={step === number ? "step" : undefined} onClick={() => { if (number < step) toStep(number); }} disabled={number >= step}><span>{number < step ? <Check size={12} aria-hidden="true" /> : `0${number}`}</span>{label}</button>; })}
    </nav>

    <div className="checkout-flow__layout">
      <section className="checkout-flow__main" aria-label={`Checkout step ${step}: ${steps[step - 1]}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} className="checkout-step" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .22 }}>
            {step === 1 ? <>
              <div className="checkout-step__heading"><span>01 / Contact</span><h2>Where should we<br /><em>reach you?</em></h2><p>We’ll use these details for your receipt and delivery updates.</p></div>
              <form noValidate className="checkout-form" onSubmit={contactForm.handleSubmit((values) => { setContact(values); toStep(2); })}>
                <label>Full name<input autoComplete="name" {...contactForm.register("fullName")} aria-invalid={!!contactForm.formState.errors.fullName} />{contactForm.formState.errors.fullName ? <small role="alert">{contactForm.formState.errors.fullName.message}</small> : null}</label>
                <label>Email address<input type="email" autoComplete="email" {...contactForm.register("email")} aria-invalid={!!contactForm.formState.errors.email} />{contactForm.formState.errors.email ? <small role="alert">{contactForm.formState.errors.email.message}</small> : null}</label>
                <label>Phone <span>Optional</span><input type="tel" autoComplete="tel" {...contactForm.register("phone")} aria-invalid={!!contactForm.formState.errors.phone} />{contactForm.formState.errors.phone ? <small role="alert">{contactForm.formState.errors.phone.message}</small> : null}</label>
                <button className="button button--primary checkout-step__continue" type="submit">Continue to delivery <ArrowRight size={15} aria-hidden="true" /></button>
              </form>
            </> : null}
            {step === 2 ? <>
              <div className="checkout-step__heading"><span>02 / Delivery address</span><h2>Where should it<br /><em>arrive?</em></h2><p>Enter a deliverable address. We’ll confirm serviceability before a live launch.</p></div>
              <form noValidate className="checkout-form" onSubmit={addressForm.handleSubmit((values) => { setAddress(values); toStep(3); })}>
                <label>Street address<input autoComplete="address-line1" {...addressForm.register("line1")} aria-invalid={!!addressForm.formState.errors.line1} />{addressForm.formState.errors.line1 ? <small role="alert">{addressForm.formState.errors.line1.message}</small> : null}</label>
                <label>Apartment, suite, etc. <span>Optional</span><input autoComplete="address-line2" {...addressForm.register("line2")} /></label>
                <div className="checkout-form__row"><label>City<input autoComplete="address-level2" {...addressForm.register("city")} aria-invalid={!!addressForm.formState.errors.city} />{addressForm.formState.errors.city ? <small role="alert">{addressForm.formState.errors.city.message}</small> : null}</label><label>State / Region<input autoComplete="address-level1" {...addressForm.register("region")} aria-invalid={!!addressForm.formState.errors.region} />{addressForm.formState.errors.region ? <small role="alert">{addressForm.formState.errors.region.message}</small> : null}</label></div>
                <div className="checkout-form__row"><label>Postal code<input autoComplete="postal-code" {...addressForm.register("postalCode")} aria-invalid={!!addressForm.formState.errors.postalCode} />{addressForm.formState.errors.postalCode ? <small role="alert">{addressForm.formState.errors.postalCode.message}</small> : null}</label><label>Country<select autoComplete="country" {...addressForm.register("countryCode")}><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="IN">India</option><option value="AU">Australia</option></select>{addressForm.formState.errors.countryCode ? <small role="alert">{addressForm.formState.errors.countryCode.message}</small> : null}</label></div>
                <div className="checkout-step__buttons"><button type="button" className="button button--outline" onClick={() => toStep(1)}><ArrowLeft size={14} aria-hidden="true" /> Back</button><button className="button button--primary" type="submit">Choose shipping <ArrowRight size={15} aria-hidden="true" /></button></div>
              </form>
            </> : null}
            {step === 3 ? <>
              <div className="checkout-step__heading"><span>03 / Shipping method</span><h2>A fitting<br /><em>arrival.</em></h2><p>Choose an estimate for the sample order. Delivery availability is revalidated before payment.</p></div>
              <div className="checkout-shipping" role="radiogroup" aria-label="Shipping method">
                <button type="button" role="radio" aria-checked={shippingMethod === "standard"} className={shippingMethod === "standard" ? "is-selected" : ""} onClick={() => setShippingMethod("standard")}><span className="checkout-shipping__radio" /><span><strong>Standard</strong><small>5–7 business days / standard estimate</small></span><b>{formatPrice(1200)}</b></button>
                <button type="button" role="radio" aria-checked={shippingMethod === "express"} className={shippingMethod === "express" ? "is-selected" : ""} onClick={() => setShippingMethod("express")}><span className="checkout-shipping__radio" /><span><strong>Express</strong><small>2–3 business days / priority estimate</small></span><b>{formatPrice(2800)}</b></button>
              </div>
              <div className="checkout-step__buttons"><button type="button" className="button button--outline" onClick={() => toStep(2)}><ArrowLeft size={14} aria-hidden="true" /> Back</button><button type="button" className="button button--primary" disabled={!quote || quoteState.loading || !!quoteState.error} onClick={() => toStep(4)}>Continue to payment <ArrowRight size={15} aria-hidden="true" /></button></div>
            </> : null}
            {step === 4 ? <>
              <div className="checkout-step__heading"><span>04 / Payment</span><h2>Payment,<br /><em>protected.</em></h2><p>Card details are entered on Stripe’s hosted checkout page. They never pass through VANTA.</p></div>
              <div className="checkout-payment-choice"><span className="checkout-payment-choice__icon"><CreditCard size={20} aria-hidden="true" /></span><span><strong>Credit or debit card</strong><small>Secure Stripe Checkout / Test mode</small></span><Check size={15} aria-hidden="true" /></div>
              <div className="checkout-payment-note"><ShieldCheck size={17} aria-hidden="true" /><p>Stripe handles card data, 3D Secure, and payment confirmation. This store only accepts Stripe test-mode keys.</p></div>
              {!quoteState.paymentReady ? <div className="checkout-flow__not-configured" role="status"><span className="checkout-flow__not-configured-dot" />Server payment credentials are not configured in this workspace. No payment can be taken until Stripe test keys and Supabase service credentials are set.</div> : null}
              <div className="checkout-step__buttons"><button type="button" className="button button--outline" onClick={() => toStep(3)}><ArrowLeft size={14} aria-hidden="true" /> Back</button><button type="button" className="button button--primary" onClick={() => toStep(5)}>Review order <ArrowRight size={15} aria-hidden="true" /></button></div>
            </> : null}
            {step === 5 ? <>
              <div className="checkout-step__heading"><span>05 / Review & confirm</span><h2>One last<br /><em>look.</em></h2><p>Your order is created only when Stripe confirms the test payment.</p></div>
              <div className="checkout-review-block"><header><strong>Contact</strong><button type="button" onClick={() => toStep(1)}>Edit</button></header><p>{contact?.fullName}<br />{contact?.email}{contact?.phone ? <><br />{contact.phone}</> : null}</p></div>
              <div className="checkout-review-block"><header><strong>Delivery</strong><button type="button" onClick={() => toStep(2)}>Edit</button></header><p>{address?.line1}{address?.line2 ? `, ${address.line2}` : ""}<br />{address?.city}, {address?.region} {address?.postalCode}<br />{address?.countryCode}</p></div>
              <div className="checkout-review-block"><header><strong>Shipping & payment</strong><button type="button" onClick={() => toStep(3)}>Edit</button></header><p>{shippingMethod === "express" ? "Express / 2–3 business days" : "Standard / 5–7 business days"}<br />Credit or debit card / Stripe test mode</p></div>
              <div className="checkout-review-block"><header><strong>Sample catalog notice</strong></header><p>All listed products and prices are demo catalog data. This flow only accepts Stripe test-mode payments.</p></div>
              {quote?.discountError ? <p className="checkout-flow__error" role="alert">{quote.discountError}</p> : null}
              {submitError ? <p className="checkout-flow__error" role="alert">{submitError}</p> : null}
              <div className="checkout-step__buttons"><button type="button" className="button button--outline" onClick={() => toStep(4)}><ArrowLeft size={14} aria-hidden="true" /> Back</button><button type="button" className="button button--primary checkout-confirm" onClick={confirmOrder} disabled={processing || !quote || quoteState.loading || !!quoteState.error || !!quote.discountError}>{processing ? <><span className="checkout-spinner" /> Preparing…</> : <>Continue to secure payment <ArrowRight size={15} aria-hidden="true" /></>}</button></div>
              {quoteState.error ? <p className="checkout-flow__error" role="alert">{quoteState.error}</p> : null}
            </> : null}
          </motion.div>
        </AnimatePresence>
      </section>

      <aside className="checkout-summary" aria-label="Order summary">
        <div className="checkout-summary__top"><div><p className="eyebrow">Your order / {items.reduce((sum, item) => sum + item.quantity, 0)} forms</p><h2>Order <em>summary.</em></h2></div><Link href="/cart">Edit bag</Link></div>
        <div className="checkout-summary__items">{quote?.items.map((line) => <article key={line.variantId}>
          <div className="checkout-summary__image">{line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="62px" /> : null}<span>{line.quantity}</span></div>
          <div><strong>{line.name}</strong><small>{line.configuration.summary}</small><b>{formatPrice(line.lineTotalCents, line.currency)}</b></div>
        </article>)}</div>
        {quoteState.loading ? <p className="checkout-summary__loading"><span className="studio-loader" /> Checking server prices</p> : null}
        {quoteState.error ? <p className="checkout-flow__error" role="alert">{quoteState.error}</p> : null}
        {quote ? <div className="checkout-summary__totals"><div><span>Subtotal</span><strong>{formatPrice(quote.subtotalCents)}</strong></div><div><span>Delivery / {quote.shippingEstimate}</span><strong>{formatPrice(quote.shippingCents)}</strong></div>{quote.discountCents ? <div className="checkout-summary__discount"><span>Discount / {quote.discountCode}</span><strong>−{formatPrice(quote.discountCents)}</strong></div> : null}<div className="checkout-summary__total"><span>Estimated total</span><strong>{formatPrice(quote.totalCents)}</strong></div><p>Taxes are not calculated in this test store. Final price is confirmed server-side.</p></div> : null}
        <div className="checkout-summary__assurance"><LockKeyhole size={13} aria-hidden="true" /><span>Encrypted, hosted payment by Stripe</span></div>
      </aside>
    </div>
  </main>;
}
