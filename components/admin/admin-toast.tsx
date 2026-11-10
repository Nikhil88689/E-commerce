"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

const eventName = "vanta-admin-toast";
export function notifyAdmin(message: string, tone: "success" | "error" = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(eventName, { detail: { message, tone } }));
}
export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: "success" | "error" }>).detail;
      setToast(detail);
      window.setTimeout(() => setToast((current) => current === detail ? null : current), 3800);
    };
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, []);
  return <>{children}{toast && <div className={`admin-toast ${toast.tone}`} role="status" aria-live="polite"><span>{toast.tone === "success" ? <Check size={15} /> : <X size={15} />}</span>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={13} /></button></div>}</>;
}
