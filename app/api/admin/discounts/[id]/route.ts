import { NextResponse } from "next/server";
import { adminDiscountSchema } from "@/lib/validation/admin";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  try { const v = adminDiscountSchema.parse(await readJson(request)); const { error } = await access.context.supabase.from("discounts").update({ code:v.code,discount_type:v.discountType,amount:v.amount,minimum_subtotal_cents:v.minimumSubtotalCents,maximum_discount_cents:v.maximumDiscountCents,usage_limit:v.usageLimit,starts_at:v.startsAt,expires_at:v.expiresAt,active:v.active }).eq("id", id); if (error) throw new Error("Discount could not be updated."); return NextResponse.json({ ok:true }); }
  catch (error) { return adminError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  const { id } = await params;
  const { error } = await access.context.supabase.from("discounts").delete().eq("id", id);
  if (error) return adminError(new Error("Discount could not be deleted; it may have been used by an order."));
  return NextResponse.json({ ok:true });
}

