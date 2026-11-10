import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";
import { accountAddressSchema } from "@/lib/validation/account";
import { z } from "zod";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return error("Sign in to access your saved addresses.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { data, error: queryError } = await supabase.from("addresses").select("id,recipient,line1,line2,city,region,postal_code,country_code,is_default,created_at").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (queryError) return error("Your address book could not be loaded.", 503);
  return NextResponse.json({ addresses: (data ?? []).map((row) => ({ id: row.id, recipient: row.recipient, line1: row.line1, line2: row.line2 ?? "", city: row.city, region: row.region, postalCode: row.postal_code, countryCode: row.country_code, isDefault: row.is_default })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const parsed = accountAddressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Review the delivery address details.", 400);
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return error("Sign in to save an address.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const value = parsed.data;
  const { isDefault, ...addressValue } = value;
  const addressHash = createHash("sha256").update(JSON.stringify({ userId: user.id, ...addressValue })).digest("hex");
  if (isDefault) {
    const { error: clearError } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    if (clearError) return error("Your default address could not be updated.", 503);
  }
  const { data, error: insertError } = await supabase.from("addresses").upsert({
    user_id: user.id,
    recipient: value.recipient,
    line1: value.line1,
    line2: value.line2 || null,
    city: value.city,
    region: value.region,
    postal_code: value.postalCode,
    country_code: value.countryCode,
    address_hash: addressHash,
    is_default: isDefault,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,address_hash" }).select("id").single();
  if (insertError) return error("This address could not be saved.", 503);
  return NextResponse.json({ id: data.id, saved: true }, { headers: { "cache-control": "no-store" } });
}

const deleteAddressSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: Request) {
  const parsed = deleteAddressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Choose a valid saved address.", 400);
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return error("Sign in to remove a saved address.", lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { error: deleteError } = await supabase.from("addresses").delete().eq("id", parsed.data.id).eq("user_id", user.id);
  if (deleteError) return error("This address could not be removed.", 503);
  return NextResponse.json({ removed: true }, { headers: { "cache-control": "no-store" } });
}
