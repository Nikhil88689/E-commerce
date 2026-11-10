"use client";

import { gsap } from "@/lib/animations/gsap";
import { useEffect, useRef, type ElementType } from "react";

type WordRevealProps = {
  text: string;
  as?: ElementType;
  className?: string;
  id?: string;
};

export function WordReveal({ text, as: Tag = "p", className, id }: WordRevealProps) {
  const elementRef = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const element = elementRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        element.querySelectorAll("[data-reveal-word]"),
        { yPercent: 115, rotateX: -18, autoAlpha: 0 },
        {
          yPercent: 0,
          rotateX: 0,
          autoAlpha: 1,
          duration: 0.72,
          stagger: 0.055,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 82%", once: true },
        },
      );
    }, element);

    return () => context.revert();
  }, []);

  return (
    <Tag ref={elementRef} id={id} className={className} aria-label={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="word-reveal__visual">
        {words.map((word, index) => (
          <span className="word-reveal__clip" key={`${word}-${index}`}>
            <span data-reveal-word="">{word}</span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
