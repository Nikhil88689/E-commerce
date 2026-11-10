"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CatalogProduct } from "@/lib/catalog/types";

export function ProductGallery({ product }: Readonly<{ product: CatalogProduct }>) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const images = product.images.length ? product.images : ["/images/concepts/object-concept.webp"];
  const activeImage = images[activeIndex] ?? images[0];

  function move(delta: number) {
    setActiveIndex((current) => (current + delta + images.length) % images.length);
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        <AnimatePresence mode="wait">
          <motion.div key={activeImage} className="product-gallery__image" initial={reducedMotion ? false : { opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.36 }}>
              <Image src={activeImage} alt={activeIndex === 0 ? product.imageAlt : `${product.name}, alternate view ${activeIndex + 1}`} fill priority sizes="(max-width: 800px) 100vw, 58vw" quality={84} />
          </motion.div>
        </AnimatePresence>
        <span className="product-gallery__index">0{activeIndex + 1} / 0{images.length}</span>
        {images.length > 1 ? <div className="product-gallery__arrows"><button type="button" aria-label="Previous product image" onClick={() => move(-1)}><ArrowLeft aria-hidden="true" size={16} /></button><button type="button" aria-label="Next product image" onClick={() => move(1)}><ArrowRight aria-hidden="true" size={16} /></button></div> : null}
        <button className="product-gallery__zoom" type="button" aria-label="View product image full screen" onClick={() => setZoomOpen(true)}><Maximize2 aria-hidden="true" size={15} /></button>
        <span className="product-gallery__caption">VANTA / FORM STUDY / {product.category.toUpperCase()}</span>
      </div>
      {images.length > 1 ? <div className="product-gallery__thumbnails" aria-label="Product image views">{images.map((image, index) => <button key={image} type="button" className={index === activeIndex ? "is-active" : ""} onClick={() => setActiveIndex(index)} aria-label={`Show product image ${index + 1}`} aria-pressed={index === activeIndex}><Image src={image} alt="" fill sizes="100px" /></button>)}</div> : null}
      <Modal open={zoomOpen} onOpenChange={setZoomOpen} title={`${product.name} / Image view`} variant="full" className="product-gallery-zoom">
        <div className="product-gallery-zoom__image"><Image src={activeImage} alt={product.imageAlt} fill sizes="100vw" quality={84} /></div>
      </Modal>
    </div>
  );
}
