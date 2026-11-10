"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { EditorialStory } from "@/lib/content/types";
import { StoryCard } from "@/components/editorial/story-card";
import { gsap, ScrollTrigger } from "@/lib/animations/gsap";

export function StoryRail({ stories }: { stories: EditorialStory[] }) {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const pinnedTrigger = useRef<ScrollTrigger | null>(null);
  const progress = useRef(0);
  const reducedMotion = Boolean(useReducedMotion());

  function updateProgress(value: number) {
    const normalized = Math.min(1, Math.max(0, value));
    progress.current = normalized;
    if (progressBar.current) progressBar.current.style.transform = `scaleX(${normalized})`;
    if (previousButton.current) previousButton.current.disabled = normalized <= 0.01;
    if (nextButton.current) nextButton.current.disabled = normalized >= 0.99;
  }

  useEffect(() => {
    const root = section.current;
    const viewport = rail.current;
    const content = track.current;
    if (!root || !viewport || !content || reducedMotion) return;

    const media = gsap.matchMedia();
    media.add("(min-width: 1100px) and (min-height: 860px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const distance = content.scrollWidth - viewport.clientWidth;
      if (distance <= 1) return;

      viewport.classList.add("is-scroll-pinned");
      const context = gsap.context(() => {
        const tween = gsap.to(content, {
          x: () => -(content.scrollWidth - viewport.clientWidth),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top+=82",
            end: () => `+=${content.scrollWidth - viewport.clientWidth}`,
            pin: root,
            pinSpacing: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (instance) => updateProgress(instance.progress),
          },
        });
        pinnedTrigger.current = tween.scrollTrigger ?? null;
      }, root);

      return () => {
        pinnedTrigger.current = null;
        viewport.classList.remove("is-scroll-pinned");
        updateProgress(0);
        context.revert();
      };
    });

    return () => media.revert();
  }, [reducedMotion, stories.length]);

  function scroll(direction: -1 | 1) {
    const node = rail.current;
    if (!node) return;

    const trigger = pinnedTrigger.current;
    if (trigger) {
      const nextProgress = Math.min(1, Math.max(0, progress.current + direction * 0.45));
      window.scrollTo({
        top: trigger.start + nextProgress * (trigger.end - trigger.start),
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return;
    }

    node.scrollBy({ left: direction * node.clientWidth * 0.72, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function updateScroll(event: React.UIEvent<HTMLDivElement>) {
    const { scrollLeft, scrollWidth, clientWidth } = event.currentTarget;
    updateProgress(scrollLeft / Math.max(1, scrollWidth - clientWidth));
  }

  if (!stories.length) return null;
  return <section className="story-rail-section" ref={section} aria-labelledby="story-rail-heading">
    <header className="editorial-section-heading"><div><p className="eyebrow">From the journal / 0{stories.length} notes</p><h2 id="story-rail-heading">Look a little <em>closer.</em></h2></div><div className="story-rail-controls"><button ref={previousButton} type="button" aria-label="Scroll stories left" onClick={() => scroll(-1)} disabled><ArrowLeft size={16} /></button><button ref={nextButton} type="button" aria-label="Scroll stories right" onClick={() => scroll(1)} disabled={stories.length < 2}><ArrowRight size={16} /></button></div></header>
    <div className="story-rail" ref={rail} onScroll={updateScroll}><div className="story-rail__track" ref={track}>{stories.map((story) => <div className="story-rail__item" key={story.slug}><StoryCard story={story} /></div>)}</div></div>
    <div className="story-rail__progress" aria-hidden="true"><span ref={progressBar} /></div>
  </section>;
}
