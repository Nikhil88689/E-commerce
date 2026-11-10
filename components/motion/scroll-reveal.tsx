"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/animations/gsap";

export function ScrollReveal({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!element || reducedMotion) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 82%",
            once: true,
          },
        },
      );
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div className={className} ref={elementRef}>
      {children}
    </div>
  );
}
