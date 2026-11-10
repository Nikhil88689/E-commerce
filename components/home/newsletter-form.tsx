"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { newsletterSchema } from "@/lib/validation/newsletter";

type NewsletterFormValues = { email: string; consent: boolean; company?: string };

export function NewsletterForm() {
  const prefersReducedMotion = useReducedMotion();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverMessage, setServerMessage] = useState("");
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterFormValues>({ defaultValues: { email: "", consent: false, company: "" } });

  async function submit(values: NewsletterFormValues) {
    clearErrors();
    setStatus("idle");
    setServerMessage("");

    const parsed = newsletterSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "consent") {
        setError("consent", { type: "validate", message: "Please agree to receive VANTA launch updates." });
      } else {
        setError("email", { type: "validate", message: "Enter a valid email address." });
      }
      return;
    }

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as { message?: string; alreadySubscribed?: boolean };

      if (!response.ok) {
        setStatus("error");
        setServerMessage(result.message ?? "The list is not available yet. Please try again later.");
        return;
      }

      setStatus("success");
      setServerMessage(
        result.alreadySubscribed
          ? "You’re already on the VANTA interest list."
          : "Your interest is registered. No email is sent until the newsletter service is connected.",
      );
      reset({ email: "", consent: false, company: "" });
    } catch {
      setStatus("error");
      setServerMessage("We couldn’t reach the signup service. Please try again later.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <div className="newsletter-signup">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.div
            key="success"
            className="newsletter-success"
            role="status"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
          >
            <span className="newsletter-success__icon">
              <Check aria-hidden="true" size={18} />
            </span>
            <p>{serverMessage}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="newsletter-form"
            onSubmit={onSubmit}
            noValidate
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          >
            <div className="newsletter-form__row">
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Your email address"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "newsletter-email-error" : "newsletter-note"}
                {...register("email")}
              />
              <button className="newsletter-form__submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "Joining" : "Join the list"}</span>
                {isSubmitting ? (
                  <LoaderCircle className="spinner" aria-hidden="true" size={17} />
                ) : (
                  <ArrowRight aria-hidden="true" size={17} />
                )}
              </button>
            </div>
            {errors.email ? (
              <p className="form-error" id="newsletter-email-error">
                {errors.email.message ?? "Enter a valid email address."}
              </p>
            ) : null}
            <div className="newsletter-form__consent">
              <input id="newsletter-consent" type="checkbox" {...register("consent")} />
              <label htmlFor="newsletter-consent">I agree to receive VANTA launch updates by email.</label>
            </div>
            {errors.consent ? <p className="form-error">{errors.consent.message}</p> : null}
            <div className="newsletter-form__trap" aria-hidden="true">
              <label htmlFor="newsletter-company">Company</label>
              <input id="newsletter-company" tabIndex={-1} autoComplete="off" {...register("company")} />
            </div>
            <p className="newsletter-form__note" id="newsletter-note">
              Your email is stored in the configured VANTA database. No marketing emails are sent until a mail service is connected.
            </p>
            {status === "error" ? (
              <p className="form-error newsletter-form__server-error" role="alert">
                {serverMessage}
              </p>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
