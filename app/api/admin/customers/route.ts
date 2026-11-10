import { NextResponse } from "next/server";
import { adminError, requireAdminResponse } from "@/lib/admin/http";

export async function GET(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const { data, error } = await access.context.supabase.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw new Error("Customer accounts could not be loaded.");
    const users = data.users;
    const ids = users.map((user) => user.id);
    const [profiles, orders] = await Promise.all([
      ids.length ? access.context.supabase.from("profiles").select("*").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? access.context.supabase.from("orders").select("user_id,total_cents,payment_status,created_at").in("user_id", ids).limit(10000) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error || orders.error) throw new Error("Customer records could not be loaded.");
    const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile]));
    const orderMap = new Map<string, { count: number; spend: number; lastOrder: string | null }>();
    for (const order of orders.data ?? []) { if (!order.user_id) continue; const value = orderMap.get(order.user_id) ?? { count: 0, spend: 0, lastOrder: null }; value.count += 1; if (order.payment_status === "paid") value.spend += Number(order.total_cents); if (!value.lastOrder || order.created_at > value.lastOrder) value.lastOrder = order.created_at; orderMap.set(order.user_id, value); }
    const customers = users.map((user) => ({ id: user.id, email: user.email ?? "", createdAt: user.created_at, lastSignInAt: user.last_sign_in_at, profile: profileMap.get(user.id) ?? null, ...(orderMap.get(user.id) ?? { count: 0, spend: 0, lastOrder: null }) })).filter((customer) => !q || customer.email.toLowerCase().includes(q) || customer.profile?.full_name?.toLowerCase().includes(q));
    return NextResponse.json({ customers, page, lastPage: data.lastPage ?? page, total: data.total ?? customers.length });
  } catch (error) { return adminError(error, 500); }
}

