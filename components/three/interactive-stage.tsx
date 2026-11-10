"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense } from "react";

type InteractiveStageProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * Shared responsive canvas boundary for product-specific R3F scenes.
 * Product details and controls should remain available as regular HTML outside this canvas.
 */
export function InteractiveStage({ label, children, className }: InteractiveStageProps) {
  return (
    <div className={className} role="img" aria-label={label}>
      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 0, 4], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
