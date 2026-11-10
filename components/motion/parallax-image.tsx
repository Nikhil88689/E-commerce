"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

type ParallaxImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  quality?: number;
};

export function ParallaxImage({ src, alt, sizes, className = "", quality = 82 }: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [16, -16]);

  return (
    <div className={`parallax-image ${className}`.trim()} ref={containerRef}>
      <motion.div className="parallax-image__inner" style={{ y }}>
        <Image src={src} alt={alt} fill sizes={sizes} quality={quality} />
      </motion.div>
    </div>
  );
}
