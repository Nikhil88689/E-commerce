import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { StoryCard } from "@/components/editorial/story-card";
import { StoryRail } from "@/components/editorial/story-rail";
import { getEditorialStories } from "@/lib/content/service";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Stories", description: "Ideas, product documentaries, development notes, and campaigns from the VANTA journal.", path: "/stories" });
export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const { stories, error } = await getEditorialStories();
  const feature = stories.find((story) => story.isFeatured) ?? stories[0];
  const remainder = stories.filter((story) => story.slug !== feature?.slug);
  const categories = [...new Set(stories.map((story) => story.category))];

  return <main id="main-content" className="editorial-page stories-index">
    <header className="editorial-index-hero editorial-index-hero--stories"><p className="eyebrow"><span className="signal-dot" /> VANTA / The journal</p><h1>Form has<br /><em>a point of view.</em></h1><div className="editorial-index-hero__foot"><p>Notes from the studio: design philosophy, product development, campaigns, and the ideas that stay with us.</p><a href="#journal">Enter the journal <ArrowDown size={14} aria-hidden="true" /></a><span>STORIES / {stories.length.toString().padStart(2, "0")}</span></div></header>
    {error ? <section className="editorial-state editorial-state--error"><p className="eyebrow">The journal / unavailable</p><h2>We could not open<br /><em>the pages.</em></h2><p>{error}</p><Link className="button button--outline" href="/">Return to VANTA <ArrowUpRight size={14} /></Link></section> : stories.length ? <>
      {feature ? <section className="stories-feature" id="journal"><header><p className="eyebrow">Featured story / {feature.category}</p><span>{feature.readTimeMinutes} MIN READ</span></header><StoryCard story={feature} featured /></section> : null}
      {remainder.length ? <StoryRail stories={remainder} /> : null}
      <nav className="stories-index__categories" aria-label="Story categories"><span className="eyebrow">Explore by note</span>{categories.map((category) => <a key={category} href={`#story-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{category} <ArrowUpRight size={12} aria-hidden="true" /></a>)}</nav>
      <section className="stories-index__archive" id="story-index"><header><p className="eyebrow">The complete journal / Published stories</p><h2>Every thought has<br /><em>a beginning.</em></h2></header><div>{categories.map((category) => <section id={`story-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={category}><p className="eyebrow">{category}</p>{stories.filter((story) => story.category === category).map((story, index) => <Link href={`/stories/${story.slug}`} key={story.slug}><span>0{index + 1} / {story.category}</span><strong>{story.title}</strong><small>{story.dek}</small><ArrowRight size={15} aria-hidden="true" /></Link>)}</section>)}</div></section>
    </> : <section className="editorial-state"><p className="eyebrow">The journal / In progress</p><h2>A thought is<br /><em>taking shape.</em></h2><p>Stories will appear here when they are ready to share.</p></section>}
    <section className="stories-newsletter"><div><p className="eyebrow">A note from VANTA / Occasional, considered</p><h2>The next thought,<br /><em>in your inbox.</em></h2><p>Join the interest list for journal notes and collection signals.</p></div><NewsletterForm /></section>
  </main>;
}
