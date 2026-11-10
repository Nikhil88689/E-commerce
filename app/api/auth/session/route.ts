import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";

export async function GET() {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return NextResponse.json({ user: null, configured: lookup.state !== "unconfigured" }, { headers: { "cache-control": "no-store" } });
  return NextResponse.json({ user: { id: lookup.context.user.id, email: lookup.context.user.email, fullName: lookup.context.user.user_metadata.full_name ?? "" }, configured: true }, { headers: { "cache-control": "no-store" } });
}
