"use client";

import { useState } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied");
        window.setTimeout(() => setMessage(""), 2200);
      } else {
        setMessage("Use your browser address bar to copy this story.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage("Sharing is unavailable in this browser.");
    }
  }

  function shareByEmail() {
    window.location.href = `mailto:?${new URLSearchParams({ subject: title, body: window.location.href }).toString()}`;
  }

  return <div className="editorial-share"><button type="button" onClick={() => void share()}><span className="editorial-share__icon">{message === "Link copied" ? <Check size={14} /> : navigatorShareSupported() ? <Share2 size={14} /> : <Link2 size={14} />}</span>{message === "Link copied" ? "Link copied" : "Share"}</button><button type="button" onClick={shareByEmail}><Mail size={14} aria-hidden="true" /><span>Send by email</span></button>{message && message !== "Link copied" ? <small role="status">{message}</small> : null}</div>;
}

function navigatorShareSupported() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
