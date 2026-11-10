"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { dropNotificationFormSchema } from "@/lib/validation/drop-notification";

type FormStatus = { kind: "idle" | "success" | "error"; message: string };

export function DropNotifyForm({ dropSlug, dropTitle }: { dropSlug: string; dropTitle: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "idle", message: "" });
    const parsed = dropNotificationFormSchema.safeParse({ email, consent, company });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message ?? "Review your email and consent." });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/drops/notify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, dropSlug }),
      });
      const result = await response.json() as { message?: string; alreadySubscribed?: boolean };
      if (!response.ok) {
        setStatus({ kind: "error", message: result.message ?? "Your request could not be saved. Try again." });
        return;
      }
      setStatus({ kind: "success", message: result.alreadySubscribed ? "This email is already on the release list." : `Your interest in ${dropTitle} has been saved. Automated email notices are not enabled yet.` });
      setEmail("");
      setConsent(false);
    } catch {
      setStatus({ kind: "error", message: "We could not reach the release list. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="drop-notify-form" onSubmit={submit} noValidate>
    <label htmlFor={`drop-email-${dropSlug}`}>Your email address</label>
    <div className="drop-notify-form__row"><input id={`drop-email-${dropSlug}`} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-describedby={`drop-consent-${dropSlug}`} aria-invalid={status.kind === "error"} /><button type="submit" disabled={submitting}>{submitting ? <>Saving <LoaderCircle className="spinner" size={15} /></> : status.kind === "success" ? <>Saved <Check size={15} /></> : <>Notify me <ArrowRight size={15} /></>}</button></div>
    <div className="drop-notify-form__consent"><input id={`drop-consent-${dropSlug}`} type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><label htmlFor={`drop-consent-${dropSlug}`}>I agree to receive an update about this release.</label></div>
    <label className="drop-notify-form__trap" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
    <p className="drop-notify-form__privacy">Your email is stored for this release signal. No automated messages are sent until a mail service is configured.</p>
    {status.message ? <p className={`drop-notify-form__message drop-notify-form__message--${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>{status.message}</p> : null}
  </form>;
}
