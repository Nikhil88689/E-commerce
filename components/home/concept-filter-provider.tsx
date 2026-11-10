"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ConceptFilterContextValue = {
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
};

const ConceptFilterContext = createContext<ConceptFilterContextValue | null>(null);

export function ConceptFilterProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const value = useMemo(() => ({ activeCategory, setActiveCategory }), [activeCategory]);

  return <ConceptFilterContext.Provider value={value}>{children}</ConceptFilterContext.Provider>;
}

export function useConceptFilter() {
  const value = useContext(ConceptFilterContext);
  if (!value) throw new Error("useConceptFilter must be used within ConceptFilterProvider.");
  return value;
}
