"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("@/components/home/hero-scene"), {
  ssr: false,
  loading: () => <div className="hero-scene__fallback" aria-hidden="true" />,
});

export function HeroCanvas() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <HeroScene />
    </div>
  );
}
