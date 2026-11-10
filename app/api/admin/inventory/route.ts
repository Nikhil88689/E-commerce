import { NextResponse } from "next/server";
import { getAdminInventory } from "@/lib/admin/data";
import { adminError, requireAdminResponse } from "@/lib/admin/http";

export async function GET() {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try { return NextResponse.json(await getAdminInventory(access.context.supabase)); }
  catch (error) { return adminError(error, 500); }
}

