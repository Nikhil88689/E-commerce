"use client";

import { ArrowUpRight, Clock3, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { categories } from "@/lib/catalog/data";

const RECENT_SEARCH_KEY = "vanta:recent-searches:v1";
const RECENT_SEARCH_EVENT = "vanta:recent-searches-changed";
const popularTerms = ["titanium", "objects", "light", "audio"];

type SearchResponse = {
  products?: Array<{ slug: string; name: string; category: string; image: string }>;
  collections?: Array<{ slug: string; name: string; description: string; image: string }>;
  error?: string;
};

function subscribeToRecentSearches(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_SEARCH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_SEARCH_EVENT, onChange);
  };
}

function getRecentSnapshot() {
  try { return localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]"; } catch { return "[]"; }
}

function parseRecentSearches(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function SearchDialog({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({ products: [], collections: [] });
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const recentRaw = useSyncExternalStore(subscribeToRecentSearches, getRecentSnapshot, () => "[]");
  const recent = parseRecentSearches(recentRaw);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => document.getElementById("site-search")?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || normalized.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setRequestError("");
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        const data = await response.json() as SearchResponse;
        if (!response.ok) throw new Error(data.error ?? "Search is temporarily unavailable.");
        setResults(data);
        setResolvedQuery(normalized);
      } catch (error) {
        if (controller.signal.aborted) return;
        setRequestError(error instanceof Error ? error.message : "Search is temporarily unavailable.");
        setResolvedQuery(normalized);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open]);

  const rememberSearch = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recent.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(RECENT_SEARCH_EVENT));
    } catch { /* Search history is optional. */ }
  }, [recent]);

  const closeDialog = useCallback(() => {
    setQuery("");
    setResults({ products: [], collections: [] });
    setResolvedQuery("");
    setLoading(false);
    setRequestError("");
    onClose();
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    rememberSearch(normalized);
    closeDialog();
    router.push(`/discover?q=${encodeURIComponent(normalized)}`);
  }

  function chooseRecent(value: string) {
    setQuery(value);
    rememberSearch(value);
  }

  const normalizedQuery = query.trim();
  const hasQuery = normalizedQuery.length >= 2;
  const currentResultsReady = resolvedQuery === normalizedQuery;
  const isSearching = hasQuery && (loading || !currentResultsReady);
  const visibleError = currentResultsReady ? requestError : "";
  const products = currentResultsReady ? results.products ?? [] : [];
  const matchingCollections = currentResultsReady ? results.collections ?? [] : [];
  const hasResults = products.length + matchingCollections.length > 0;

  return (
    <Modal open={open} onOpenChange={(value) => !value && closeDialog()} title="Search VANTA" variant="full" className="search-dialog">
      <div className="search-dialog__body">
        <form className="search-dialog__form" onSubmit={submit}>
          <label className="search-dialog__input-wrap" htmlFor="site-search">
            <Search aria-hidden="true" size={20} strokeWidth={1.4} />
            <input id="site-search" type="search" placeholder="Search objects, materials, ideas…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" aria-controls="search-live-results" />
            {query ? <button className="search-dialog__clear" type="button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" size={17} /></button> : null}
          </label>
          <button className="search-dialog__submit" type="submit" disabled={!query.trim()}>View all results <ArrowUpRight aria-hidden="true" size={14} /></button>
        </form>

        <div id="search-live-results" aria-live="polite" aria-busy={isSearching}>
          {hasQuery ? (
            <>
              <p className="eyebrow search-dialog__label">{isSearching ? "Searching the index" : "Live matches"}</p>
              {visibleError ? <p className="search-dialog__empty" role="alert">{visibleError}</p> : null}
              {!isSearching && !visibleError && hasResults ? (
                <div className="search-dialog__groups">
                  {products.length ? (
                    <section className="search-group">
                      <h3 className="search-group__title">Products / {products.length.toString().padStart(2, "0")}</h3>
                      <ul className="search-results search-results--products">
                        {products.map((product) => <li key={product.slug}><Link href={`/product/${product.slug}`} onClick={() => { rememberSearch(query); closeDialog(); }}><span className="search-result-image"><Image src={product.image} alt="" fill sizes="64px" /></span><span><span className="search-results__title">{product.name}</span><span className="search-results__detail">{product.category} · Demo product</span></span><ArrowUpRight aria-hidden="true" size={17} /></Link></li>)}
                      </ul>
                    </section>
                  ) : null}
                  {matchingCollections.length ? (
                    <section className="search-group">
                      <h3 className="search-group__title">Collections / {matchingCollections.length.toString().padStart(2, "0")}</h3>
                      <ul className="search-results">
                        {matchingCollections.map((collection) => <li key={collection.slug}><Link href={`/discover?collection=${collection.slug}`} onClick={() => { rememberSearch(query); closeDialog(); }}><span><span className="search-results__title">{collection.name}</span><span className="search-results__detail">{collection.description}</span></span><ArrowUpRight aria-hidden="true" size={17} /></Link></li>)}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
              {!isSearching && !visibleError && !hasResults ? <div className="search-dialog__empty"><p>No products or collections match “{normalizedQuery}”.</p><Link href="/discover" onClick={closeDialog}>Browse every direction <ArrowUpRight aria-hidden="true" size={14} /></Link></div> : null}
            </>
          ) : (
            <>
              {recent.length ? (
                <section className="search-suggestions">
                  <div className="search-suggestions__heading"><p className="eyebrow">Recent searches</p><button type="button" onClick={() => { try { localStorage.removeItem(RECENT_SEARCH_KEY); window.dispatchEvent(new Event(RECENT_SEARCH_EVENT)); } catch { /* Search history is optional. */ } }}>Clear</button></div>
                  <div className="search-suggestions__pills">{recent.map((item) => <button key={item} type="button" onClick={() => chooseRecent(item)}><Clock3 aria-hidden="true" size={12} />{item}</button>)}</div>
                </section>
              ) : null}
              <section className="search-suggestions"><p className="eyebrow">Popular directions</p><div className="search-suggestions__pills">{popularTerms.map((item) => <button key={item} type="button" onClick={() => setQuery(item)}>{item}</button>)}</div></section>
              <section className="search-categories"><p className="eyebrow">Browse a world</p><div>{categories.map((item) => <Link key={item.slug} href={`/discover/${item.slug}`} onClick={closeDialog}>{item.name}<ArrowUpRight aria-hidden="true" size={13} /></Link>)}</div></section>
            </>
          )}
        </div>
        <p className="search-dialog__disclaimer">Search covers demo products, collections, materials, and categories.</p>
      </div>
    </Modal>
  );
}
