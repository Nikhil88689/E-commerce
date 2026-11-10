import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { DropCard } from "@/components/editorial/drop-card";
import { getCatalogProduct } from "@/lib/catalog/service";
import { getDropStatus, getEditorialDrops } from "@/lib/content/service";
import type { DropStatus } from "@/lib/content/types";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Release Signals", description: "Upcoming, active, and archived VANTA releases. Countdown clocks appear only for confirmed release timestamps.", path: "/drops" });
export const dynamic = "force-dynamic";

const sections: Array<{ status: DropStatus; heading: string; eyebrow: string; copy: string }> = [
  { status: "upcoming", heading: "On the horizon.", eyebrow: "Confirmed / Upcoming", copy: "A live countdown begins only after a release time is confirmed." },
  { status: "active", heading: "In the world.", eyebrow: "Released / Active", copy: "Forms with an open release window." },
  { status: "unannounced", heading: "Still becoming.", eyebrow: "In progress / Unannounced", copy: "Release studies without a confirmed date. Subscribe for a note when a signal is set." },
  { status: "past", heading: "In the archive.", eyebrow: "Past / Previous releases", copy: "Earlier VANTA releases and their stories." },
];

export default async function DropsPage() {
  const { drops, error } = await getEditorialDrops();
  const entries = await Promise.all(drops.map(async (drop) => ({
    drop,
    status: getDropStatus(drop),
    product: drop.productSlug ? (await getCatalogProduct(drop.productSlug)).product : null,
  })));
  const upcoming = entries.find((entry) => entry.status === "upcoming");
  const grouped = new Map<DropStatus, typeof entries>();
  for (const entry of entries) grouped.set(entry.status, [...(grouped.get(entry.status) ?? []), entry]);

  return <main id="main-content" className="editorial-page drops-page">
    <header className="drops-hero"><div className="drops-hero__orb" aria-hidden="true"><i /><i /><i /><span>V</span></div><div className="drops-hero__copy"><p className="eyebrow"><span className="signal-dot" /> VANTA / Release signal</p><h1>Made ready.<br /><em>Released with intent.</em></h1><p>Every release has its own moment. Dates are shown only when confirmed; no clock runs on an idea still taking shape.</p><a href="#release-index">Read the signals <ArrowDown size={14} aria-hidden="true" /></a></div><div className="drops-hero__status"><span>{upcoming ? "NEXT CONFIRMED SIGNAL" : "NEXT RELEASE / UNSCHEDULED"}</span><strong>{upcoming?.drop.releaseAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(upcoming.drop.releaseAt)) : "WHEN IT IS READY"}</strong><small>{upcoming ? upcoming.drop.title : "No public date is set"}</small></div></header>
    <div id="release-index" className="drops-index-intro"><p className="eyebrow">The release ledger / {drops.length.toString().padStart(2, "0")} signals</p><p>Follow a form from first signal to the archive.</p></div>
    {error ? <div className="editorial-state editorial-state--error"><p className="eyebrow">Release ledger / unavailable</p><h2>The signal<br /><em>is out of view.</em></h2><p>{error}</p><Link className="button button--outline" href="/collections">Explore collections <ArrowRight size={14} /></Link></div> : sections.map((section) => {
      const items = grouped.get(section.status) ?? [];
      return <section className={`drop-status-section drop-status-section--${section.status}`} key={section.status} aria-labelledby={`drop-section-${section.status}`}>
        <header className="editorial-section-heading"><div><p className="eyebrow">{section.eyebrow} / {items.length.toString().padStart(2, "0")}</p><h2 id={`drop-section-${section.status}`}>{section.heading}</h2></div><p>{section.copy}</p></header>
        {items.length ? <div className="drop-grid">{items.map(({ drop, product, status }, index) => <DropCard key={drop.slug} drop={drop} product={product} status={status} index={index} />)}</div> : <div className="drop-section-empty"><span>—</span><p>{section.status === "upcoming" ? "No confirmed releases. We will publish a date here once it is set." : section.status === "active" ? "No release window is open right now." : section.status === "unannounced" ? "No release studies are being shown right now." : "No past releases are in the archive yet."}</p></div>}
      </section>;
    })}
    <section className="drops-page__closing"><p className="eyebrow">One signal at a time / VANTA</p><h2>Leave room for<br /><em>what comes next.</em></h2><Link className="button button--primary" href="/#newsletter">Join the VANTA note <ArrowRight size={14} /></Link></section>
  </main>;
}
