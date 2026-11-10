import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, CalendarClock } from "lucide-react";
import { DropCountdown } from "@/components/editorial/drop-countdown";
import { DropNotifyForm } from "@/components/editorial/drop-notify-form";
import { ShareButton } from "@/components/editorial/share-button";
import { getCatalogProduct } from "@/lib/catalog/service";
import { getDropStatus, getEditorialDrop } from "@/lib/content/service";
import { pageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { drop } = await getEditorialDrop(slug);
  return drop ? pageMetadata({ title: `${drop.title} / Release signal`, description: drop.description, path: `/drops/${slug}`, image: drop.heroImage }) : pageMetadata({ title: "Release signal", description: "This VANTA release could not be found.", path: "/drops", noIndex: true });
}

export const dynamic = "force-dynamic";

export default async function DropDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { drop, error } = await getEditorialDrop(slug);
  if (!drop && !error) notFound();
  const productResult = drop?.productSlug ? await getCatalogProduct(drop.productSlug) : null;
  const product = productResult?.product ?? null;
  const status = drop ? getDropStatus(drop) : "unannounced";

  return <main id="main-content" className="editorial-page drop-detail">
    <div className="editorial-breadcrumb"><Link href="/drops"><ArrowLeft size={13} aria-hidden="true" /> ALL RELEASE SIGNALS</Link><ShareButton title={drop?.title ?? "VANTA release"} /></div>
    {error || !drop ? <section className="editorial-state editorial-state--error"><p className="eyebrow">Release / unavailable</p><h1>This signal<br /><em>is out of view.</em></h1><p>{error ?? "This release could not be found."}</p><Link className="button button--outline" href="/drops">Return to releases <ArrowRight size={14} /></Link></section> : <>
      <header className="drop-detail__hero"><Image src={drop.heroImage} alt={drop.heroAlt} fill priority sizes="100vw" quality={84} /><div className="drop-detail__shade" /><div className="drop-detail__hero-copy"><p className="eyebrow"><span className={`drop-status__dot drop-status__dot--${status}`} /> {drop.eyebrow} / {status.replaceAll("_", " ")}</p><h1>{drop.title}</h1><p>{drop.description}</p><span className="drop-detail__serial">RELEASE SIGNAL / {drop.slug.toUpperCase()}</span></div></header>
      <div className="drop-detail__body">
        <section className="drop-detail__story"><p className="eyebrow">A form in progress / The note</p><h2>Not a date<br /><em>until it is certain.</em></h2><p>{drop.description}</p><p>Release timing is managed from the VANTA release record. An exact countdown appears only after a confirmed timestamp has been published.</p><ShareButton title={drop.title} /></section>
        <aside className="drop-detail__signal"><p className="eyebrow">Release status / {status.toUpperCase()}</p>{status === "upcoming" && drop.releaseAt ? <><h2>Next, in <em>time.</em></h2><DropCountdown releaseAt={drop.releaseAt} /></> : status === "active" ? <><h2>In the <em>world.</em></h2><p>This release is active{drop.endsAt ? ` until ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(drop.endsAt))} UTC` : ""}.</p></> : status === "past" ? <><h2>Part of the<br /><em>archive.</em></h2><p>This release window has ended. Product availability may have changed.</p></> : <><h2>Still <em>becoming.</em></h2><p>No release date has been confirmed.</p></>}
          {drop.releaseAt ? <p className="drop-detail__date"><CalendarClock size={15} aria-hidden="true" />{new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date(drop.releaseAt))} UTC</p> : null}
        </aside>
      </div>
      {drop.notifyEnabled && status !== "past" ? <section className="drop-detail__notify" id="notify"><div><p className="eyebrow">The next note / Release updates</p><h2>Be there when<br /><em>it arrives.</em></h2><p>Leave your email to register interest in this release. We will only record this request for the selected drop.</p></div><DropNotifyForm dropSlug={drop.slug} dropTitle={drop.title} /></section> : null}
      <section className="drop-detail__product"><div className="drop-detail__product-mark"><Box size={22} aria-hidden="true" /></div><div><p className="eyebrow">Related form / Product study</p>{product ? <><h2>{product.name}</h2><p>{product.description}</p><p className="drop-detail__availability">{product.stockQuantity > 0 ? product.isDemo ? `${product.stockQuantity} units in sample inventory` : `${product.stockQuantity} available` : product.isDemo ? "No sample availability currently listed" : "Currently unavailable"}{product.isDemo ? " / Demo catalog" : ""}</p><Link className="button button--outline" href={`/product/${product.slug}`}>Explore the product <ArrowUpRight size={14} /></Link></> : <><h2>The product<br /><em>is in progress.</em></h2><p>The associated form is not currently published in the product archive.</p><Link className="editorial-text-link" href="/discover">Explore the product archive <ArrowRight size={14} /></Link></>}</div></section>
      <footer className="drop-detail__footer"><Link href="/drops"><ArrowLeft size={13} /> All release signals</Link><Link href="/collections">Explore collections <ArrowRight size={13} /></Link></footer>
    </>}
  </main>;
}
