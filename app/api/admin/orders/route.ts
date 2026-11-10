import { NextResponse } from "next/server";
import { getAdminOrders } from "@/lib/admin/data";
import { adminError, requireAdminResponse } from "@/lib/admin/http";

export async function GET(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try { const query = new URL(request.url).searchParams.get("q") ?? ""; return NextResponse.json({ orders: await getAdminOrders(access.context.supabase, query) }); }
  catch (error) { return adminError(error, 500); }
}

