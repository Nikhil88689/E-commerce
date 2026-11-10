import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EditorialCollection } from "@/lib/content/types";

export function CollectionCard({ collection, index = 0, productCount }: { collection: EditorialCollection; index?: number; productCount?: number }) {
  return <Link className={`editorial-collection-card${index % 3 === 1 ? " editorial-collection-card--offset" : ""}`} href={`/collections/${collection.slug}`} style={{ "--collection-accent": collection.accentColor } as React.CSSProperties}>
    <div className="editorial-collection-card__image"><Image src={collection.imageUrl} alt={collection.imageAlt} fill sizes="(max-width: 680px) 90vw, (max-width: 1100px) 46vw, 36vw" quality={82} /><span aria-hidden="true">0{String(index + 1).padStart(2, "0")}</span><ArrowUpRight size={20} aria-hidden="true" /></div>
    <div className="editorial-collection-card__details"><p className="eyebrow">{collection.eyebrow} <span>{productCount === undefined ? `${collection.categories.length} worlds` : `${productCount} forms`}</span></p><h2>{collection.name}</h2><p>{collection.description}</p></div>
  </Link>;
}
