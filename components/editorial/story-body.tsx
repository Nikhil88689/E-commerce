"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/animations/gsap";
import type { StoryBlock } from "@/lib/content/types";

export function StoryBody({ blocks }: { blocks: StoryBlock[] }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-story-reveal]", body).forEach((block, index) => {
        gsap.fromTo(block, { autoAlpha: 0, y: 22 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          delay: index % 2 === 1 ? 0.04 : 0,
          ease: "power2.out",
          scrollTrigger: { trigger: block, start: "top 84%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-story-image-reveal]", body).forEach((image) => {
        gsap.fromTo(image, { clipPath: "inset(0 0 9% 0)" }, {
          clipPath: "inset(0 0 0% 0)",
          duration: 0.95,
          ease: "power2.inOut",
          scrollTrigger: { trigger: image, start: "top 86%", once: true },
        });
      });
    }, body);

    return () => context.revert();
  }, [blocks]);

  return <div className="story-body" ref={bodyRef}>{blocks.map((block, index) => {
    if (block.type === "image") return <figure className="story-body__image" data-story-reveal key={`image-${index}`}><div data-story-image-reveal><Image src={block.src} alt={block.alt} fill sizes="(max-width: 760px) 96vw, 70vw" quality={84} /></div>{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
    if (block.type === "quote") return <blockquote data-story-reveal key={`quote-${index}`}>{block.text}<span>VANTA / NOTES ON FORM</span></blockquote>;
    if (block.type === "heading") return <h2 data-story-reveal key={`heading-${index}`}>{block.text}</h2>;
    return <p className="story-body__paragraph" data-story-reveal key={`paragraph-${index}`}>{block.text}</p>;
  })}</div>;
}
