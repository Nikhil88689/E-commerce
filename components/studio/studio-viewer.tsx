"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useRef, useState, type ErrorInfo, type PointerEvent, type WheelEvent } from "react";
import { useReducedMotion } from "motion/react";
import { Focus, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { ProductConfiguration, StudioFinish, StudioMaterial } from "@/lib/catalog/configuration";
import type { StudioInteraction, StudioView } from "./studio-scene";

const StudioScene = dynamic(() => import("./studio-scene").then((module) => module.StudioScene), {
  ssr: false,
  loading: () => <div className="studio-viewer__loading"><span className="studio-loader" /><p>Preparing the form</p><small>PROCEDURAL MODEL / VANTA OBJECT STUDY</small></div>,
});

type ViewerProps = {
  product: CatalogProduct;
  configuration: ProductConfiguration;
  material: StudioMaterial;
  finish: StudioFinish;
};

class SceneBoundary extends Component<React.PropsWithChildren<{ fallback: React.ReactNode; onError: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("The interactive studio model could not be rendered", error, info.componentStack); this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function StudioViewer({ product, configuration, material, finish }: ViewerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const interaction = useRef<StudioInteraction>({ rotation: { current: [0.12, -0.04] }, zoom: { current: 1 } });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState<StudioView>("front");
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    interaction.current.rotation.current[0] += dx * 0.008;
    interaction.current.rotation.current[1] = Math.max(-0.72, Math.min(0.72, interaction.current.rotation.current[1] + dy * 0.006));
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateZoom(Math.max(0.78, Math.min(1.48, interaction.current.zoom.current - event.deltaY * 0.0012)));
  }
  function updateZoom(next: number) {
    const value = Math.max(0.78, Math.min(1.48, next));
    interaction.current.zoom.current = value;
    setZoom(value);
  }
  function reset() {
    interaction.current.rotation.current = [0.12, -0.04];
    updateZoom(1);
    setView("front");
  }

  return <section className={`studio-viewer${dragging ? " is-dragging" : ""}`} aria-label={`${product.name} interactive 3D viewer`}>
    <div className="studio-viewer__stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel} role="group" aria-label="Drag to rotate the procedural three-dimensional product model; use the controls to change camera angle and zoom">
      <div className="studio-viewer__glow" aria-hidden="true" />
      <div className="studio-viewer__grid" aria-hidden="true" />
      {!failed ? <SceneBoundary fallback={null} onError={() => setFailed(true)}><StudioScene product={product} configuration={configuration} material={material} finish={finish} view={view} interaction={interaction.current} reducedMotion={reducedMotion} /></SceneBoundary> : null}
      {failed ? <div className="studio-viewer__fallback"><div className="studio-viewer__fallback-image"><Image src={product.images[0] ?? "/images/concepts/object-concept.webp"} alt={product.imageAlt} fill sizes="(max-width: 820px) 100vw, 68vw" /></div><span>STILL IMAGE / 3D PREVIEW UNAVAILABLE</span><p>The model could not be loaded. This image is a reference view only.</p></div> : null}
      <span className="studio-viewer__serial">V / {product.category.toUpperCase()} / {product.slug.toUpperCase()}</span>
      <div className="studio-viewer__zoom" aria-label="Zoom controls">
        <button type="button" aria-label="Zoom out" onClick={() => updateZoom(zoom - 0.12)} disabled={zoom <= 0.78}><ZoomOut size={15} aria-hidden="true" /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => updateZoom(zoom + 0.12)} disabled={zoom >= 1.48}><ZoomIn size={15} aria-hidden="true" /></button>
      </div>
      <div className="studio-viewer__angles" aria-label="Camera angle">
        {(["front", "side", "back", "top"] as const).map((angle) => <button key={angle} type="button" className={view === angle ? "is-active" : ""} aria-pressed={view === angle} onClick={() => setView(angle)}>{angle}</button>)}
      </div>
      <button className="studio-viewer__reset" type="button" onClick={reset}><RotateCcw size={13} aria-hidden="true" /> Reset view</button>
      <div className="studio-viewer__hint"><Focus size={13} aria-hidden="true" /> Drag to rotate <span>·</span> Scroll to zoom</div>
    </div>
    <div className="studio-viewer__caption"><span>LIVE FORM / PROCEDURAL MESH</span><span>{product.categoryName} / MODEL 01</span></div>
  </section>;
}
