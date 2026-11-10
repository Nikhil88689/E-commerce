import { NextResponse } from "next/server";
import { adminCollectionSchema, adminDropSchema, adminHomepageSectionSchema, adminStorySchema } from "@/lib/validation/admin";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";

const tables = { collections:"collections", stories:"stories", drops:"drops", homepage:"homepage_sections" } as const;
type Kind = keyof typeof tables;
function parseKind(kind: string): Kind | null { return Object.hasOwn(tables, kind) ? kind as Kind : null; }
function mapInput(kind: Kind, input: unknown) {
  if (kind === "collections") { const v=adminCollectionSchema.parse(input); return { slug:v.slug,name:v.name,eyebrow:v.eyebrow,description:v.description,statement:v.statement,image_url:v.imageUrl,image_alt:v.imageAlt,accent_color:v.accentColor,categories:v.categories,is_featured:v.isFeatured,sort_order:v.sortOrder,is_published:v.isPublished }; }
  if (kind === "stories") { const v=adminStorySchema.parse(input); return { slug:v.slug,title:v.title,eyebrow:v.eyebrow,category:v.category,dek:v.dek,hero_image:v.heroImage,hero_alt:v.heroAlt,related_product_slug:v.relatedProductSlug,author:v.author,read_time_minutes:v.readTimeMinutes,body:v.body,is_featured:v.isFeatured,is_published:v.isPublished,sort_order:v.sortOrder,published_at:v.publishedAt }; }
  if (kind === "drops") { const v=adminDropSchema.parse(input); return { slug:v.slug,title:v.title,eyebrow:v.eyebrow,description:v.description,product_slug:v.productSlug,hero_image:v.heroImage,hero_alt:v.heroAlt,release_at:v.releaseAt,ends_at:v.endsAt,notify_enabled:v.notifyEnabled,is_published:v.isPublished,sort_order:v.sortOrder }; }
  const v=adminHomepageSectionSchema.parse(input); return { section_key:v.sectionKey,title:v.title,content:v.content,enabled:v.enabled,sort_order:v.sortOrder,updated_at:new Date().toISOString() };
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { kind } = await params; const table=parseKind(kind); if (!table) return NextResponse.json({ error:"Unknown content type." }, { status:404 });
  const { data,error } = await access.context.supabase.from(table).select("*").order("sort_order", { ascending:true });
  if(error) return adminError(new Error("Content could not be loaded."),500);
  return NextResponse.json({ items:data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { kind } = await params; const table=parseKind(kind); if (!table) return NextResponse.json({ error:"Unknown content type." }, { status:404 });
  try { const row=mapInput(table,await readJson(request)); const { error }=await access.context.supabase.from(table).insert(row as never); if(error) throw new Error(error.code === "23505" ? "This slug or section key already exists." : "Content could not be created."); return NextResponse.json({ ok:true },{status:201}); }
  catch(error){return adminError(error);}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { kind } = await params; const table=parseKind(kind); if (!table) return NextResponse.json({ error:"Unknown content type." }, { status:404 });
  try { const body=await readJson(request) as { key?: string; data?: unknown }; if(!body.key || !body.data) return adminError(new Error("A record key and updated data are required.")); const row=mapInput(table,body.data); const keyColumn=kind === "homepage" ? "section_key" : "slug"; const { error }=await access.context.supabase.from(table).update(row as never).eq(keyColumn,body.key); if(error) throw new Error("Content could not be updated."); return NextResponse.json({ok:true}); }
  catch(error){return adminError(error);}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { kind } = await params; const table=parseKind(kind); if (!table) return NextResponse.json({ error:"Unknown content type." }, { status:404 });
  const key=new URL(request.url).searchParams.get("key"); if(!key) return adminError(new Error("A record key is required."));
  const { error }=await access.context.supabase.from(table).delete().eq(kind === "homepage" ? "section_key" : "slug",key);
  if(error) return adminError(new Error("Content could not be deleted."));
  return NextResponse.json({ok:true});
}

