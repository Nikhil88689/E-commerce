import type { MetadataRoute } from "next";
import { categories, demoProducts } from "@/lib/catalog/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config/site";
import { demoCollections, demoDrops, demoStories } from "@/lib/content/demo";
import { getEditorialCollections, getEditorialDrops, getEditorialStories } from "@/lib/content/service";

export const revalidate = 3600;

type ProductPath = { slug: string; updated_at: string | null };

async function getPublishedProducts(): Promise<ProductPath[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return demoProducts.map((product) => ({ slug: product.slug, updated_at: product.createdAt }));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const rows: ProductPath[] = [];
    const batchSize = 1000;
    for (let offset = 0; offset < 50_000; offset += batchSize) {
      const { data, error } = await supabase.from("products").select("slug,updated_at")
        .eq("is_published", true).order("slug").range(offset, offset + batchSize - 1);
      if (error) throw error;
      const batch = (data ?? []).map((item) => ({ slug: String(item.slug), updated_at: item.updated_at ? String(item.updated_at) : null }));
      rows.push(...batch);
      if (batch.length < batchSize) break;
    }
    return rows;
  } catch (error) {
    console.error("Product sitemap query failed", error);
    return demoProducts.map((product) => ({ slug: product.slug, updated_at: product.createdAt }));
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collectionResult, dropResult, storyResult] = await Promise.all([
    getPublishedProducts(), getEditorialCollections(), getEditorialDrops(), getEditorialStories(),
  ]);
  const collections = collectionResult.error ? demoCollections : collectionResult.collections;
  const drops = dropResult.error ? demoDrops : dropResult.drops;
  const stories = storyResult.error ? demoStories : storyResult.stories;
  const url = (path: string) => new URL(path, siteConfig.url).toString();

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/discover"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((category) => ({ url: url(`/discover/${category.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: url("/collections"), changeFrequency: "weekly", priority: 0.8 },
    ...collections.map((collection) => ({ url: url(`/collections/${collection.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: url("/drops"), changeFrequency: "daily", priority: 0.7 },
    ...drops.map((drop) => ({ url: url(`/drops/${drop.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: url("/stories"), changeFrequency: "weekly", priority: 0.7 },
    ...stories.map((story) => ({ url: url(`/stories/${story.slug}`), lastModified: story.publishedAt ? new Date(story.publishedAt) : undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...products.map((product) => ({ url: url(`/product/${product.slug}`), lastModified: product.updated_at ? new Date(product.updated_at) : undefined, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
