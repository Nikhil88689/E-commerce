"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

type MagneticLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
  target?: string;
  rel?: string;
};

export function MagneticLink({ children, className = "", arrow = true, ...props }: MagneticLinkProps) {
  const prefersReducedMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 220, damping: 18, mass: 0.2 });
  const y = useSpring(rawY, { stiffness: 220, damping: 18, mass: 0.2 });

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    if (prefersReducedMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - bounds.left - bounds.width / 2) * 0.1);
    rawY.set((event.clientY - bounds.top - bounds.height / 2) * 0.12);
  }

  function resetPosition() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <motion.a
      className={`magnetic-link ${className}`.trim()}
      style={{ x, y }}
      data-cursor-label="OPEN"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPosition}
      {...props}
    >
      <span>{children}</span>
      {arrow ? <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.4} /> : null}
    </motion.a>
  );
}
