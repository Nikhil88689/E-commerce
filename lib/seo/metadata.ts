import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function pageMetadata({ title, description, path, image = "/opengraph-image", noIndex = false, type = "website" }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: siteConfig.name,
      title: `${title} / VANTA`,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: `${title} / VANTA` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} / VANTA`,
      description,
      images: [image],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
