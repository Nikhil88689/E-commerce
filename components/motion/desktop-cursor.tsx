"use client";

import { useEffect, useState } from "react";

export function DesktopCursor() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cursor = document.querySelector<HTMLElement>("[data-vanta-cursor]");
    const cursorLabel = cursor?.querySelector<HTMLElement>(".desktop-cursor__label");
    if (!cursor) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const updateEnabled = () => {
      const nextEnabled = pointer.matches && !motionPreference.matches;
      setEnabled(nextEnabled);
      document.documentElement.classList.toggle("vanta-cursor-enabled", nextEnabled);
      if (!nextEnabled) cursor.classList.remove("is-visible", "is-labeled", "is-pressed");
    };

    const move = (event: PointerEvent) => {
      if (!pointer.matches || motionPreference.matches || event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursor.classList.add("is-visible");
        frame = 0;
      });
    };

    const inspectTarget = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const labeled = target?.closest<HTMLElement>("[data-cursor-label]");
      const label = labeled?.dataset.cursorLabel?.trim() ?? "";
      if (cursorLabel) cursorLabel.textContent = label;
      cursor.classList.toggle("is-labeled", Boolean(label));
    };

    const setPressed = (event: PointerEvent) => {
      if (event.pointerType === "mouse") cursor.classList.add("is-pressed");
    };
    const release = () => cursor.classList.remove("is-pressed");
    const hide = () => cursor.classList.remove("is-visible", "is-labeled", "is-pressed");

    updateEnabled();
    pointer.addEventListener("change", updateEnabled);
    motionPreference.addEventListener("change", updateEnabled);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", inspectTarget, { passive: true });
    document.addEventListener("pointerdown", setPressed, { passive: true });
    document.addEventListener("pointerup", release, { passive: true });
    document.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("mouseleave", hide);

    return () => {
      pointer.removeEventListener("change", updateEnabled);
      motionPreference.removeEventListener("change", updateEnabled);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", inspectTarget);
      document.removeEventListener("pointerdown", setPressed);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", hide);
      document.removeEventListener("mouseleave", hide);
      document.documentElement.classList.remove("vanta-cursor-enabled");
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={`desktop-cursor${enabled ? " is-enabled" : ""}`} data-vanta-cursor aria-hidden="true">
      <span className="desktop-cursor__ring" />
      <span className="desktop-cursor__label" />
    </div>
  );
}
