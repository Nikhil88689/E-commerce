import { NextResponse } from "next/server";
import { adminError, readJson, requireAdminResponse } from "@/lib/admin/http";
import { inventoryAdjustmentSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const { access, response } = await requireAdminResponse(); if (response) return response;
  try {
    const input = inventoryAdjustmentSchema.parse(await readJson(request));
    const { data, error } = await access.context.supabase.rpc("admin_adjust_inventory", { p_product_id:input.productId,p_variant_id:input.variantId,p_delta:input.delta,p_reason:input.reason,p_reference:input.reference,p_actor:access.context.user.id });
    if (error) throw new Error(error.message.includes("Inventory") ? error.message : "Inventory adjustment could not be saved.");
    return NextResponse.json({ quantity: data });
  } catch (error) { return adminError(error); }
}

