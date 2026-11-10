"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";

export type MegaMenuKey = "discover" | "collections" | "drops" | "stories";

const menuContent: Record<MegaMenuKey, { eyebrow: string; title: string; copy: string; links: Array<{ label: string; detail: string; href: string }> }> = {
  discover: {
    eyebrow: "Discover / Find a starting point",
    title: "Look closer.",
    copy: "Move through the concept archive by category, material, or idea.",
    links: [
      { label: "All directions", detail: "Browse the complete product index", href: "/discover" },
      { label: "Objects", detail: "Useful forms, reconsidered", href: "/discover/objects" },
      { label: "Audio", detail: "A different kind of presence", href: "/discover/audio" },
      { label: "Footwear", detail: "Forms made for movement", href: "/discover/footwear" },
      { label: "Living and accessories", detail: "Light, detail, and daily ritual", href: "/discover/living" },
      { label: "The VANTA point of view", detail: "A note on considered design", href: "/#manifesto" },
    ],
  },
  collections: {
    eyebrow: "Collections / Shared direction",
    title: "One idea, many forms.",
    copy: "Collection studies connect concepts across sound, space, movement, and light.",
    links: [
      { label: "Edition 001", detail: "A first signal across five worlds", href: "/collections/edition-001" },
      { label: "Material Memory", detail: "Metal, stone, and the marks they gather", href: "/collections/material-memory" },
      { label: "All collections", detail: "Explore every shared direction", href: "/collections" },
    ],
  },
  drops: {
    eyebrow: "Drops / Release signal",
    title: "When it’s ready.",
    copy: "No releases are scheduled. Confirmed dates will appear here when they exist.",
    links: [
      { label: "Release status", detail: "Upcoming, active, and archived releases", href: "/drops" },
      { label: "Get the first signal", detail: "See release notes and dates", href: "/drops" },
    ],
  },
  stories: {
    eyebrow: "Stories / Notes from VANTA",
    title: "The thought behind the form.",
    copy: "A developing point of view on what we keep, how we use it, and what we make next.",
    links: [
      { label: "The VANTA journal", detail: "Product documentaries and studio notes", href: "/stories" },
      { label: "Design philosophy", detail: "A better object changes the everyday", href: "/stories/the-space-between" },
    ],
  },
};

export function MegaMenu({ menu, onClose }: Readonly<{ menu: MegaMenuKey | null; onClose: () => void }>) {
  const content = menu ? menuContent[menu] : menuContent.discover;

  return (
    <Modal
      open={menu !== null}
      onOpenChange={(open) => !open && onClose()}
      title={content.title}
      variant="full"
      className="mega-dialog"
    >
      <div className="mega-menu">
        <div className="mega-menu__intro">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p>{content.copy}</p>
        </div>
        <nav className="mega-menu__links" aria-label={`${menu ?? "Discover"} links`}>
          {content.links.map((link, index) => (
            <Link href={link.href} key={link.href} onClick={onClose}>
              <span className="mega-menu__number">0{index + 1}</span>
              <span className="mega-menu__link-copy">
                <span>{link.label}</span>
                <small>{link.detail}</small>
              </span>
              <ArrowUpRight aria-hidden="true" size={19} />
            </Link>
          ))}
        </nav>
        <div className="mega-menu__signature" aria-hidden="true">
          <span>V</span>
          <span>VANTA / FORM IN PROGRESS</span>
        </div>
      </div>
    </Modal>
  );
}
