import { NextResponse } from "next/server";
import { adminDiscountSchema } from "@/lib/validation/admin";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";

export async function GET() {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { data, error } = await access.context.supabase.from("discounts").select("*").order("created_at", { ascending: false });
  if (error) return adminError(new Error("Discounts could not be loaded."), 500);
  return NextResponse.json({ discounts: data ?? [] });
}

export async function POST(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try {
    const v = adminDiscountSchema.parse(await readJson(request));
    const { data, error } = await access.context.supabase.from("discounts").insert({ code:v.code,discount_type:v.discountType,amount:v.amount,minimum_subtotal_cents:v.minimumSubtotalCents,maximum_discount_cents:v.maximumDiscountCents,usage_limit:v.usageLimit,starts_at:v.startsAt,expires_at:v.expiresAt,active:v.active }).select("id").single();
    if (error || !data) throw new Error(error?.code === "23505" ? "That discount code already exists." : "Discount could not be created.");
    return NextResponse.json({ id:data.id }, { status: 201 });
  } catch (error) { return adminError(error); }
}

