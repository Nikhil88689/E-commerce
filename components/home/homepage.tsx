import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { ConceptFilterProvider } from "@/components/home/concept-filter-provider";
import { ConceptGallery } from "@/components/home/concept-gallery";
import { HeroCanvas } from "@/components/home/hero-canvas";
import { IntroLoader } from "@/components/home/intro-loader";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { ProductWorlds } from "@/components/home/product-worlds";
import { MagneticLink } from "@/components/motion/magnetic-link";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { WordReveal } from "@/components/motion/word-reveal";
import { ParallaxImage } from "@/components/motion/parallax-image";
import { concepts } from "@/lib/content/homepage";
import { getHomepageSections } from "@/lib/content/service";

export async function Homepage() {
  const sectionSettings = await getHomepageSections();
  const featuredImage = concepts[1];
  const audioImage = concepts[0];

  return (
    <>
      <IntroLoader />
      <main id="main-content" style={{ display: "flex", flexDirection: "column" }}>
        <section className="hero" id="top" aria-labelledby="hero-title" style={{ order: 0 }}>
          <div className="hero__atmosphere" aria-hidden="true" />
          <HeroCanvas />
          <div className="hero__ghost-word" aria-hidden="true">
            VANTA
          </div>
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">
              <span className="signal-dot" aria-hidden="true" />
              An independent study in what comes next
            </p>
            <h1 className="hero__title" id="hero-title">
              <span className="hero__title-small">A new way</span>
              <span>to <em>see.</em></span>
            </h1>
            <p className="hero__description">
              Objects, ideas, and the space between them. A future-facing concept archive by VANTA.
            </p>
            <div className="hero__actions">
              <MagneticLink className="button button--primary hero__cta" href="#concepts">
                Explore the archive
              </MagneticLink>
              <Link className="hero__secondary" href="#worlds">
                Discover the worlds <ArrowUpRight aria-hidden="true" size={15} />
              </Link>
            </div>
          </div>
          <div className="hero__coordinates" aria-hidden="true">
            <span>FORM STUDY / 01</span>
            <span>001 — 005</span>
          </div>
          <a className="scroll-cue" href="#manifesto">
            <span>Scroll to feel the difference</span>
            <span className="scroll-cue__line" />
            <ArrowDown aria-hidden="true" size={14} strokeWidth={1.4} />
          </a>
          <div className="hero__vertical-note" aria-hidden="true">DESIGN / IN MOTION</div>
        </section>

        <section className="manifesto" id="manifesto" aria-labelledby="manifesto-title" style={{ order: 1 }}>
          <div className="section-index eyebrow">
            <span>01</span> / The VANTA point of view
          </div>
          <div className="manifesto__body">
            <p className="manifesto__kicker">Beyond the expected.</p>
            <WordReveal
              as="h2"
              className="manifesto__title"
              id="manifesto-title"
              text="A better object changes how the everyday feels."
            />
            <p className="manifesto__copy">
              VANTA looks for the moment utility becomes feeling: a line that holds your attention, a material that rewards a closer look, a form that makes room for possibility.
            </p>
            <Link className="manifesto__link" href="#story">
              The ideas behind VANTA <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <span className="manifesto__orbit" aria-hidden="true" />
          <span className="manifesto__watermark" aria-hidden="true">V</span>
        </section>

        <ConceptFilterProvider>
          {sectionSettings.featured?.enabled !== false && <section className="featured" id="concepts" aria-labelledby="featured-title" style={{ order: sectionSettings.featured?.sortOrder ?? 2 }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow"><span className="section-index__number">02</span> / {sectionSettings.featured?.title ?? "Selected directions"}</p>
                <h2 id="featured-title">{sectionSettings.featured?.content.headline ?? <>Ideas in <em>form.</em></>}</h2>
              </div>
              <p className="section-heading__note">
                {sectionSettings.featured?.content.description ?? "These are visual studies, not products for sale. No prices or release dates have been set."}
              </p>
            </div>
            <div id="products" className="featured__gallery-anchor">
              <ConceptGallery />
            </div>
          </section>}

          {sectionSettings.collections?.enabled !== false && <section className="worlds" id="worlds" aria-labelledby="worlds-title" style={{ order: sectionSettings.collections?.sortOrder ?? 3 }}>
            <div className="section-heading section-heading--worlds">
              <div>
                <p className="eyebrow"><span className="section-index__number">03</span> / {sectionSettings.collections?.title ?? "Find your point of view"}</p>
                <h2 id="worlds-title">{sectionSettings.collections?.content.headline ?? <>Enter a <em>world.</em></>}</h2>
              </div>
              <p className="section-heading__note">
                {sectionSettings.collections?.content.description ?? "Five lenses on modern life. Choose one to filter the concept archive."}
              </p>
            </div>
            <ProductWorlds />
          </section>}
        </ConceptFilterProvider>

        {sectionSettings.collections?.enabled !== false && <section className="collection" id="collection" aria-labelledby="collection-title" style={{ order: sectionSettings.collections?.sortOrder ?? 3 }}>
          <div className="collection__image collection__image--left">
            <ParallaxImage
              src={featuredImage.image}
              alt={featuredImage.imageAlt}
              sizes="(max-width: 760px) 42vw, 25vw"
              quality={82}
            />
          </div>
          <div className="collection__image collection__image--right">
            <ParallaxImage
              src={audioImage.image}
              alt={audioImage.imageAlt}
              sizes="(max-width: 760px) 42vw, 25vw"
              quality={82}
            />
          </div>
          <div className="collection__center">
            <p className="eyebrow">{sectionSettings.collections?.title ?? "A collection study / 001"}</p>
            <WordReveal as="h2" className="collection__title" text={sectionSettings.collections?.content.campaignHeadline ?? "Objects for the elsewhere."} />
            <p className="collection__copy">
              {sectionSettings.collections?.content.campaignDescription ?? "A shared direction across sound, space, movement, and light. Presented as concepts while the first VANTA collection takes shape."}
            </p>
            <MagneticLink className="button button--outline collection__cta" href="/collections">
              Explore the collections
            </MagneticLink>
          </div>
          <div className="collection__footer eyebrow">
            <span>DESIGN / FEELING / FUNCTION</span>
            <span>NO RELEASE DATE SET</span>
          </div>
        </section>}

        {sectionSettings.drops?.enabled !== false && <section className="drops" id="drops" aria-labelledby="drops-title" style={{ order: sectionSettings.drops?.sortOrder ?? 4 }}>
          <div className="drops__signal" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="drops__copy">
            <p className="eyebrow"><span className="section-index__number">04</span> / {sectionSettings.drops?.title ?? "The release signal"}</p>
            <h2 id="drops-title">{sectionSettings.drops?.content.headline ?? <>Nothing drops<br />until it’s <em>ready.</em></>}</h2>
            <p>{sectionSettings.drops?.content.description ?? "No release is scheduled. We’ll share a date here only when one is confirmed."}</p>
          </div>
          <Link className="drops__link" href="/drops">
            Explore release signals <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </section>}

        {sectionSettings.stories?.enabled !== false && <section className="story" id="story" aria-labelledby="story-title" style={{ order: sectionSettings.stories?.sortOrder ?? 5 }}>
          <div className="section-index eyebrow"><span>05</span> / {sectionSettings.stories?.title ?? "A note on becoming"}</div>
          <div className="story__content">
            <p className="story__kicker">{sectionSettings.stories?.content.headline ?? "The VANTA story"}</p>
            <WordReveal as="h2" className="story__title" id="story-title" text={sectionSettings.stories?.content.statement ?? "Not more things. More meaning in the things we choose."} />
            <div className="story__bottom">
              <p>
                {sectionSettings.stories?.content.description ?? "We are building a space for considered design: where each object begins with a question, and each answer leaves room for another."}
              </p>
              <span className="story__signature">VANTA / A WORK IN PROGRESS</span>
            </div>
          </div>
        </section>}

        <section className="newsletter" id="newsletter" aria-labelledby="newsletter-title" style={{ order: 6 }}>
          <div className="newsletter__aside">
            <p className="eyebrow">A note from VANTA</p>
            <span className="newsletter__stamp" aria-hidden="true">V.</span>
          </div>
          <div className="newsletter__body">
            <p className="eyebrow">06 / Stay close to what’s next</p>
            <h2 id="newsletter-title">The next signal,<br /><em>direct to you.</em></h2>
            <p className="newsletter__description">
              Occasional notes on new ideas, design directions, and confirmed releases.
            </p>
            <NewsletterForm />
          </div>
          <div className="newsletter__index" aria-hidden="true">VANTA / DISPATCH 001</div>
        </section>

        <section className="quiet-close" aria-label="VANTA concept archive notice" style={{ order: 7 }}>
          <ScrollReveal className="quiet-close__inner">
            <p className="eyebrow">A considered beginning</p>
            <p>Made of possibility.<br /><em>Ready when it is.</em></p>
            <Link href="#top" className="quiet-close__top" aria-label="Back to top">
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </ScrollReveal>
        </section>
      </main>
    </>
  );
}
