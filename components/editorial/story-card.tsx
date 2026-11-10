import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EditorialStory } from "@/lib/content/types";

export function StoryCard({ story, featured = false }: { story: EditorialStory; featured?: boolean }) {
  return <article className={`editorial-story-card${featured ? " editorial-story-card--featured" : ""}`}>
    <Link className="editorial-story-card__image" href={`/stories/${story.slug}`}>
      <Image src={story.heroImage} alt={story.heroAlt} fill sizes={featured ? "(max-width: 760px) 92vw, 58vw" : "(max-width: 680px) 86vw, 30vw"} quality={82} />
      <span>{story.category} <i aria-hidden="true">/</i> {story.readTimeMinutes} min read</span>
      <ArrowUpRight size={20} aria-hidden="true" />
    </Link>
    <div className="editorial-story-card__copy"><p className="eyebrow">{story.eyebrow}</p><Link href={`/stories/${story.slug}`}><h2>{story.title}</h2></Link><p>{story.dek}</p><Link className="editorial-text-link" href={`/stories/${story.slug}`}>Read the story <ArrowUpRight size={13} aria-hidden="true" /></Link></div>
  </article>;
}
