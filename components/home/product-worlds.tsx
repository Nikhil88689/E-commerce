"use client";

import { ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { productWorlds } from "@/lib/content/homepage";
import { ParallaxImage } from "@/components/motion/parallax-image";

export function ProductWorlds() {
  return (
    <div className="world-grid">
      {productWorlds.map((world, index) => (
        <Link
          key={world.id}
          href={`/discover/${world.id}`}
          className={`world-card world-card--${world.tone} world-card--${world.id}`}
          data-category={world.category.toLowerCase()}
        >
          <ParallaxImage
            src={world.image}
            alt={world.imageAlt}
            sizes="(max-width: 640px) 82vw, (max-width: 980px) 44vw, 20vw"
            className="world-card__image"
            quality={80}
          />
          <span className="world-card__number">0{index + 1} / 05</span>
          <span className="world-card__content">
            <span className="world-card__name">{world.name}</span>
            <span className="world-card__descriptor">{world.descriptor}</span>
          </span>
          <span className="world-card__arrow" aria-hidden="true">
            <ArrowDownRight size={17} strokeWidth={1.4} />
          </span>
        </Link>
      ))}
    </div>
  );
}
