import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { ShareButton } from "@/components/editorial/share-button";
import { StoryBody } from "@/components/editorial/story-body";
import { StoryCard } from "@/components/editorial/story-card";
import { getCatalogProduct } from "@/lib/catalog/service";
import { getEditorialStories, getEditorialStory } from "@/lib/content/service";
import { pageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { story } = await getEditorialStory(slug);
  return story ? pageMetadata({ title: story.title, description: story.dek, path: `/stories/${slug}`, image: story.heroImage, type: "article" }) : pageMetadata({ title: "VANTA Journal", description: "This VANTA journal story could not be found.", path: "/stories", noIndex: true });
}

export const dynamic = "force-dynamic";

export default async function StoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ story, error }, { stories }] = await Promise.all([getEditorialStory(slug), getEditorialStories()]);
  if (!story && !error) notFound();
  const productResult = story?.relatedProductSlug ? await getCatalogProduct(story.relatedProductSlug) : null;
  const product = productResult?.product ?? null;
  const relatedStories = stories.filter((item) => item.slug !== story?.slug).slice(0, 2);

  return <main id="main-content" className="editorial-page story-detail">
    <div className="editorial-breadcrumb"><Link href="/stories"><ArrowLeft size={13} aria-hidden="true" /> THE JOURNAL</Link>{story ? <ShareButton title={story.title} /> : null}</div>
    {error || !story ? <section className="editorial-state editorial-state--error"><p className="eyebrow">Journal / unavailable</p><h1>This page<br /><em>is out of view.</em></h1><p>{error ?? "This story could not be found."}</p><Link className="button button--outline" href="/stories">Return to the journal <ArrowRight size={14} /></Link></section> : <>
      <header className="story-detail__heading"><p className="eyebrow">{story.eyebrow} / {story.category}</p><h1>{story.title}</h1><p>{story.dek}</p><div><span>WORDS / {story.author.toUpperCase()}</span><time dateTime={story.publishedAt}>{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(story.publishedAt))}</time><span>{story.readTimeMinutes} MIN READ</span></div></header>
      <figure className="story-detail__hero"><Image src={story.heroImage} alt={story.heroAlt} fill priority sizes="100vw" quality={84} /><figcaption><span>{story.category} / VANTA JOURNAL</span><span>FIG. 0{story.sortOrder}</span></figcaption></figure>
      <article className="story-detail__article"><div className="story-detail__article-meta"><span>VANTA / JOURNAL</span><span>001 — 0{story.sortOrder}</span></div><StoryBody blocks={story.body} /><footer><ShareButton title={story.title} /><Link href="/stories">More from the journal <ArrowRight size={13} aria-hidden="true" /></Link></footer></article>
      {product ? <section className="story-product-note"><div className="story-product-note__image"><Image src={product.images[0]} alt={product.imageAlt} fill sizes="(max-width: 700px) 90vw, 44vw" quality={82} /></div><div><p className="eyebrow">Related form / {product.categoryName}</p><h2>{product.name}</h2><p>{product.description}</p><Link className="button button--outline" href={`/product/${product.slug}`}>Explore this form <ArrowUpRight size={14} aria-hidden="true" /></Link></div></section> : null}
      {relatedStories.length ? <section className="story-related"><header><p className="eyebrow">Keep reading / VANTA journal</p><h2>Stay with<br /><em>the thought.</em></h2></header><div>{relatedStories.map((item) => <StoryCard story={item} key={item.slug} />)}</div></section> : null}
    </>}
  </main>;
}
