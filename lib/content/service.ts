import { demoCollections, demoDrops, demoStories } from "@/lib/content/demo";
import { categorySlugs } from "@/lib/catalog/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomepageSection = { title:string; content:Record<string,string>; enabled:boolean; sortOrder:number };

export async function getHomepageSections():Promise<Record<string,HomepageSection>>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return {};
  try{
    const supabase=await createSupabaseServerClient();
    const {data,error}=await supabase.rpc("get_public_homepage_sections");
    if(error)throw error;
    if(!data||typeof data!=="object"||Array.isArray(data))return {};
    return Object.fromEntries(Object.entries(data as Record<string,unknown>).flatMap(([key,value])=>{
      if(!value||typeof value!=="object"||Array.isArray(value))return [];
      const row=value as Record<string,unknown>;
      const raw=row.content&&typeof row.content==="object"&&!Array.isArray(row.content)?row.content as Record<string,unknown>:{};
      const content=Object.fromEntries(Object.entries(raw).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));
      return [[key,{title:String(row.title??""),content,enabled:row.enabled===true,sortOrder:Number(row.sortOrder??0)}]];
    }));
  }catch(error){console.error("Homepage section query failed",error);return {};}
}
import type { DropStatus, EditorialCollection, EditorialDrop, EditorialStory, StoryBlock } from "@/lib/content/types";

const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function mapCollection(row: Record<string, unknown>): EditorialCollection {
  const categoryValues = Array.isArray(row.categories) ? row.categories.map(String) : [];
  return {
    slug: String(row.slug), name: String(row.name), eyebrow: String(row.eyebrow ?? "Collection study"),
    description: String(row.description ?? ""), statement: String(row.statement ?? ""),
    imageUrl: String(row.image_url ?? ""), imageAlt: String(row.image_alt ?? ""),
    accentColor: String(row.accent_color ?? "#bda27b"),
    categories: categoryValues.filter((value): value is EditorialCollection["categories"][number] => categorySlugs.includes(value as EditorialCollection["categories"][number])),
    isFeatured: Boolean(row.is_featured), sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapBlocks(value: unknown): StoryBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): StoryBlock[] => {
    if (!item || typeof item !== "object") return [];
    const block = item as Record<string, unknown>;
    if ((block.type === "paragraph" || block.type === "quote" || block.type === "heading") && typeof block.text === "string") {
      return [{ type: block.type, text: block.text }];
    }
    if (block.type === "image" && typeof block.src === "string" && typeof block.alt === "string") {
      return [{ type: "image", src: block.src, alt: block.alt, ...(typeof block.caption === "string" ? { caption: block.caption } : {}) }];
    }
    return [];
  });
}

function mapStory(row: Record<string, unknown>): EditorialStory {
  return {
    slug: String(row.slug), title: String(row.title), eyebrow: String(row.eyebrow ?? "VANTA journal"),
    category: String(row.category ?? "Journal"), dek: String(row.dek ?? ""),
    heroImage: String(row.hero_image ?? ""), heroAlt: String(row.hero_alt ?? ""),
    relatedProductSlug: typeof row.related_product_slug === "string" ? row.related_product_slug : null,
    author: String(row.author ?? "VANTA Studio"), readTimeMinutes: Number(row.read_time_minutes ?? 4),
    body: mapBlocks(row.body), isFeatured: Boolean(row.is_featured), sortOrder: Number(row.sort_order ?? 0),
    publishedAt: String(row.published_at ?? ""),
  };
}

function mapDrop(row: Record<string, unknown>): EditorialDrop {
  return {
    slug: String(row.slug), title: String(row.title), eyebrow: String(row.eyebrow ?? "Release signal"),
    description: String(row.description ?? ""), productSlug: typeof row.product_slug === "string" ? row.product_slug : null,
    heroImage: String(row.hero_image ?? ""), heroAlt: String(row.hero_alt ?? ""),
    releaseAt: typeof row.release_at === "string" ? row.release_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    notifyEnabled: Boolean(row.notify_enabled), sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function getEditorialCollections(query = ""): Promise<{ collections: EditorialCollection[]; error: string | null }> {
  const normalized = query.trim().toLowerCase();
  if (!configured()) return { collections: demoCollections.filter((item) => !normalized || `${item.name} ${item.description} ${item.categories.join(" ")}`.toLowerCase().includes(normalized)), error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("collections").select("slug,name,eyebrow,description,statement,image_url,image_alt,accent_color,categories,is_featured,sort_order").eq("is_published", true).order("sort_order");
    if (error) throw error;
    const items = (data ?? []).map((row) => mapCollection(row as Record<string, unknown>));
    return { collections: items.filter((item) => !normalized || `${item.name} ${item.description} ${item.categories.join(" ")}`.toLowerCase().includes(normalized)), error: null };
  } catch {
    return { collections: [], error: "Collections could not be loaded. Please try again." };
  }
}

export async function getEditorialCollection(slug: string): Promise<{ collection: EditorialCollection | null; error: string | null }> {
  if (!configured()) return { collection: demoCollections.find((item) => item.slug === slug) ?? null, error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("collections").select("slug,name,eyebrow,description,statement,image_url,image_alt,accent_color,categories,is_featured,sort_order").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return { collection: data ? mapCollection(data as Record<string, unknown>) : null, error: null };
  } catch {
    return { collection: null, error: "This collection could not be loaded. Please try again." };
  }
}

export async function getEditorialStories(): Promise<{ stories: EditorialStory[]; error: string | null }> {
  if (!configured()) return { stories: [...demoStories].sort((a, b) => a.sortOrder - b.sortOrder), error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("stories").select("slug,title,eyebrow,category,dek,hero_image,hero_alt,related_product_slug,author,read_time_minutes,body,is_featured,sort_order,published_at").eq("is_published", true).order("sort_order").order("published_at", { ascending: false });
    if (error) throw error;
    return { stories: (data ?? []).map((row) => mapStory(row as Record<string, unknown>)), error: null };
  } catch {
    return { stories: [], error: "Stories could not be loaded. Please try again." };
  }
}

export async function getEditorialStory(slug: string): Promise<{ story: EditorialStory | null; error: string | null }> {
  if (!configured()) return { story: demoStories.find((item) => item.slug === slug) ?? null, error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("stories").select("slug,title,eyebrow,category,dek,hero_image,hero_alt,related_product_slug,author,read_time_minutes,body,is_featured,sort_order,published_at").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return { story: data ? mapStory(data as Record<string, unknown>) : null, error: null };
  } catch {
    return { story: null, error: "This story could not be loaded. Please try again." };
  }
}

export async function getEditorialDrops(): Promise<{ drops: EditorialDrop[]; error: string | null }> {
  if (!configured()) return { drops: [...demoDrops].sort((a, b) => a.sortOrder - b.sortOrder), error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("drops").select("slug,title,eyebrow,description,product_slug,hero_image,hero_alt,release_at,ends_at,notify_enabled,sort_order").eq("is_published", true).order("sort_order");
    if (error) throw error;
    return { drops: (data ?? []).map((row) => mapDrop(row as Record<string, unknown>)), error: null };
  } catch {
    return { drops: [], error: "Release information could not be loaded. Please try again." };
  }
}

export async function getEditorialDrop(slug: string): Promise<{ drop: EditorialDrop | null; error: string | null }> {
  if (!configured()) return { drop: demoDrops.find((item) => item.slug === slug) ?? null, error: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("drops").select("slug,title,eyebrow,description,product_slug,hero_image,hero_alt,release_at,ends_at,notify_enabled,sort_order").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return { drop: data ? mapDrop(data as Record<string, unknown>) : null, error: null };
  } catch {
    return { drop: null, error: "This release could not be loaded. Please try again." };
  }
}

export function getDropStatus(drop: EditorialDrop, now = Date.now()): DropStatus {
  if (!drop.releaseAt) return "unannounced";
  const startsAt = new Date(drop.releaseAt).getTime();
  if (!Number.isFinite(startsAt)) return "unannounced";
  if (now < startsAt) return "upcoming";
  if (drop.endsAt) {
    const endsAt = new Date(drop.endsAt).getTime();
    if (Number.isFinite(endsAt) && now >= endsAt) return "past";
  }
  return "active";
}
