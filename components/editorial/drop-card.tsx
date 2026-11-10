import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { DropStatus, EditorialDrop } from "@/lib/content/types";
import { DropCountdown } from "@/components/editorial/drop-countdown";

const statusCopy: Record<DropStatus, string> = { unannounced: "Date unconfirmed", upcoming: "Upcoming release", active: "Release active", past: "Past release" };

export function DropCard({ drop, product, status, index }: { drop: EditorialDrop; product: CatalogProduct | null; status: DropStatus; index: number }) {
  const action = status === "past" ? "Explore the archive" : status === "active" && product ? "Explore the form" : "Release details";
  const href = status === "active" && product ? `/product/${product.slug}` : `/drops/${drop.slug}`;
  return <article className={`drop-card drop-card--${status}`} style={{ "--drop-index": index } as React.CSSProperties}>
    <Link className="drop-card__image" href={`/drops/${drop.slug}`}><Image src={drop.heroImage} alt={drop.heroAlt} fill sizes="(max-width: 700px) 90vw, 44vw" quality={84} /><span className={`drop-status drop-status--${status}`}>{status === "upcoming" ? <Clock3 size={11} aria-hidden="true" /> : <i aria-hidden="true" />}{statusCopy[status]}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>
    <div className="drop-card__copy"><p className="eyebrow">{drop.eyebrow} <span>{product ? `${product.categoryName} / ${product.name}` : "VANTA release"}</span></p><h3>{drop.title}</h3><p>{drop.description}</p>
      {status === "upcoming" && drop.releaseAt ? <DropCountdown releaseAt={drop.releaseAt} /> : status === "active" ? <p className="drop-card__availability">Release window is open / {product?.stockQuantity ? `${product.stockQuantity} ${product.isDemo ? "sample units listed" : "available"}` : "Availability not listed"}</p> : status === "unannounced" ? <p className="drop-card__availability">A release date has not been confirmed.</p> : <p className="drop-card__availability">Archived release / details remain available.</p>}
      <div className="drop-card__actions"><Link className="editorial-text-link" href={href}>{action} <ArrowRight size={14} aria-hidden="true" /></Link>{drop.notifyEnabled && status !== "past" ? <Link className="drop-card__notify-link" href={`/drops/${drop.slug}#notify`}>Notify me <ArrowUpRight size={13} aria-hidden="true" /></Link> : null}</div>
    </div>
  </article>;
}
