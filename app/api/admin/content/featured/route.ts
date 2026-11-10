import { NextResponse } from "next/server";
import { z } from "zod";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";

const schema=z.object({ id:z.string().uuid(), isFeatured:z.boolean(), featuredRank:z.number().int().min(1).max(10000) });
export async function PATCH(request:Request){
  const {access,response}=await requireAdminResponse();if(response)return response;
  try{const input=schema.parse(await readJson(request));const {error}=await access.context.supabase.from("products").update({is_featured:input.isFeatured,featured_rank:input.featuredRank,updated_at:new Date().toISOString()}).eq("id",input.id);if(error)throw new Error("Featured product could not be updated.");return NextResponse.json({ok:true});}catch(error){return adminError(error);}
}

