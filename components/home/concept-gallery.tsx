"use client";

import { motion, useReducedMotion } from "motion/react";
import { Bookmark, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ParallaxImage } from "@/components/motion/parallax-image";
import { concepts, type Concept } from "@/lib/content/homepage";
import { useConceptFilter } from "@/components/home/concept-filter-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const SAVED_CONCEPTS_KEY = "vanta:saved-concepts:v1";
const SAVED_CONCEPTS_EVENT = "vanta:saved-concepts-changed";

function readSavedConcepts() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_CONCEPTS_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function SavedConceptButton({ concept }: Readonly<{ concept: Concept }>) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener(SAVED_CONCEPTS_EVENT, onStoreChange);
    window.addEventListener("storage", onStoreChange);
    return () => {
      window.removeEventListener(SAVED_CONCEPTS_EVENT, onStoreChange);
      window.removeEventListener("storage", onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(() => readSavedConcepts().includes(concept.id), [concept.id]);
  const isSaved = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggleSaved() {
    try {
      const current = readSavedConcepts();
      const next = current.includes(concept.id)
        ? current.filter((id) => id !== concept.id)
        : [...current, concept.id];
      localStorage.setItem(SAVED_CONCEPTS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SAVED_CONCEPTS_EVENT));
    } catch {
      // Leave the saved state unchanged if browser storage is unavailable.
    }
  }

  return (
    <button
      className={`concept-card__save${isSaved ? " is-saved" : ""}`}
      type="button"
      aria-label={`${isSaved ? "Remove" : "Save"} ${concept.name} ${isSaved ? "from" : "to"} your inspiration list`}
      aria-pressed={isSaved}
      onClick={toggleSaved}
    >
      <Bookmark aria-hidden="true" size={16} strokeWidth={1.4} fill={isSaved ? "currentColor" : "none"} />
    </button>
  );
}

function ConceptCard({
  concept,
  onSelect,
  index,
}: Readonly<{ concept: Concept; onSelect: (concept: Concept) => void; index: number }>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className="concept-card"
      id={`concept-${concept.id}`}
      initial={prefersReducedMotion ? false : { opacity: 1, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.55, delay: prefersReducedMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={prefersReducedMotion ? undefined : { y: -5 }}
    >
      <motion.div
        className="concept-card__media"
        initial={prefersReducedMotion ? false : { clipPath: "inset(0 0 4% 0)" }}
        whileInView={{ clipPath: "inset(0 0 0% 0)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.82, delay: prefersReducedMotion ? 0 : index * 0.06, ease: [0.76, 0, 0.24, 1] }}
      >
        <ParallaxImage
          src={concept.image}
          alt={concept.imageAlt}
          sizes="(max-width: 640px) 88vw, (max-width: 1000px) 44vw, 25vw"
          className="concept-card__parallax"
          quality={84}
        />
        <span className="concept-card__status">Unreleased concept</span>
        <SavedConceptButton concept={concept} />
        <button
          type="button"
          className="concept-card__image-action"
          onClick={() => onSelect(concept)}
          aria-label={`View ${concept.name} concept details`}
        >
          <ArrowUpRight aria-hidden="true" size={19} strokeWidth={1.4} />
        </button>
      </motion.div>
      <div className="concept-card__meta">
        <div>
          <p className="concept-card__category">{concept.category} / Form study</p>
          <h3>{concept.name}</h3>
          <p className="concept-card__material">{concept.material}</p>
        </div>
        <span className="concept-card__price-state">No retail price</span>
      </div>
      <Button className="concept-card__details" variant="ghost" size="small" onClick={() => onSelect(concept)}>
        Explore concept <ArrowUpRight aria-hidden="true" size={14} />
      </Button>
    </motion.article>
  );
}

export function ConceptGallery() {
  const { activeCategory, setActiveCategory } = useConceptFilter();
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const displayedConcepts = useMemo(
    () => concepts.filter((concept) => !activeCategory || concept.category === activeCategory),
    [activeCategory],
  );

  return (
    <>
      <div className="concept-gallery__toolbar">
        <p className="eyebrow">Concept archive / {String(displayedConcepts.length).padStart(2, "0")}</p>
        {activeCategory ? (
          <button className="text-button" type="button" onClick={() => setActiveCategory(null)}>
            Showing {activeCategory} <span aria-hidden="true">×</span> View all
          </button>
        ) : (
          <p className="concept-gallery__note">Visual studies only · Nothing is currently for sale</p>
        )}
      </div>

      {displayedConcepts.length > 0 ? (
        <div className="concept-grid">
          {displayedConcepts.map((concept, index) => (
            <ConceptCard key={concept.id} concept={concept} index={index} onSelect={setSelectedConcept} />
          ))}
        </div>
      ) : (
        <div className="concept-empty">
          <p className="eyebrow">{activeCategory} / In development</p>
          <p>There are no visual studies in this world yet.</p>
          <button className="text-button" type="button" onClick={() => setActiveCategory(null)}>
            Return to all concepts <ArrowUpRight aria-hidden="true" size={14} />
          </button>
        </div>
      )}

      <Modal
        open={selectedConcept !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedConcept(null);
        }}
        title={selectedConcept?.name ?? "Concept details"}
        variant="dialog"
        className="concept-dialog"
      >
        {selectedConcept ? (
          <div className="concept-detail">
            <div className="concept-detail__image">
              <Image
                src={selectedConcept.image}
                alt={selectedConcept.imageAlt}
                fill
                sizes="(max-width: 700px) 86vw, 460px"
                quality={84}
              />
            </div>
            <div className="concept-detail__copy">
              <p className="eyebrow">{selectedConcept.category} / Unreleased concept</p>
              <p className="concept-detail__description">{selectedConcept.detail}</p>
              <p className="concept-detail__material">{selectedConcept.material}</p>
              <p className="concept-detail__notice">
                No retail price or release date has been set. This image represents a design direction only.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
