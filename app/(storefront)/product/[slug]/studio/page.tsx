import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioExperience } from "@/components/studio/studio-experience";
import { getCatalogProduct } from "@/lib/catalog/service";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getCatalogProduct(slug);
  return product
    ? pageMetadata({ title: `${product.name} Studio`, description: `Explore color, material, finish, and add-ons for ${product.name} in the VANTA interactive product studio.`, path: `/product/${slug}/studio`, noIndex: true })
    : pageMetadata({ title: "Studio / VANTA", description: "The VANTA product studio could not be found.", path: "/discover", noIndex: true });
}

export default async function ProductStudioPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { product, error } = await getCatalogProduct(slug);
  if (!product && !error) notFound();
  if (!product) return <main id="main-content" className="studio-error"><p className="eyebrow">VANTA / Product studio</p><h1>The form could not be prepared.</h1><p>{error}</p></main>;
  return <StudioExperience product={product} />;
}
