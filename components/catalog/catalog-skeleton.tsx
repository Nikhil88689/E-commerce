export function CatalogSkeleton() {
  return (
    <div className="catalog-grid catalog-grid--skeleton" aria-label="Loading catalog" role="status">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="catalog-skeleton-card" key={index}>
          <div className="catalog-skeleton-card__image" />
          <div className="catalog-skeleton-card__line catalog-skeleton-card__line--short" />
          <div className="catalog-skeleton-card__line" />
        </div>
      ))}
      <span className="sr-only">Loading products</span>
    </div>
  );
}
