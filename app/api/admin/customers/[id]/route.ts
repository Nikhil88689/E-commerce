import { NextResponse } from "next/server";
import { adminError, requireAdminResponse } from "@/lib/admin/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  const [auth, profile, orders, addresses] = await Promise.all([
    access.context.supabase.auth.admin.getUserById(id), access.context.supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
    access.context.supabase.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }), access.context.supabase.from("addresses").select("*").eq("user_id", id),
  ]);
  if (auth.error || profile.error || orders.error || addresses.error) return adminError(new Error("Customer profile could not be loaded."), 500);
  if (!auth.data.user) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  return NextResponse.json({ user: auth.data.user, profile: profile.data, orders: orders.data ?? [], addresses: addresses.data ?? [] });
}

