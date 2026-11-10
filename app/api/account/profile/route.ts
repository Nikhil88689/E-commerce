import { NextResponse } from "next/server";
import { getCustomerContext } from "@/lib/auth/customer";
import { profileUpdateSchema } from "@/lib/validation/account";

function unavailable(status: number) {
  return NextResponse.json({ error: status === 401 ? "Sign in to access your account settings." : "Customer accounts are not configured in this environment." }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return unavailable(lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { data, error } = await supabase.from("profiles").select("full_name,phone,email_marketing,order_updates").eq("user_id", user.id).maybeSingle();
  if (error) return unavailable(503);
  return NextResponse.json({
    email: user.email ?? "",
    fullName: data?.full_name || user.user_metadata.full_name || "",
    phone: data?.phone ?? "",
    emailMarketing: data?.email_marketing ?? false,
    orderUpdates: data?.order_updates ?? true,
  }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review your name, email, and phone details." }, { status: 400 });
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") return unavailable(lookup.state === "anonymous" ? 401 : 503);
  const { supabase, user } = lookup.context;
  const { fullName, phone, emailMarketing, orderUpdates, email } = parsed.data;

  if (email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return NextResponse.json({ error: "Supabase could not start the email change. Check your account settings and try again." }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: user.id,
    full_name: fullName,
    phone,
    email_marketing: emailMarketing,
    order_updates: orderUpdates,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (profileError) return unavailable(503);

  const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (metadataError) return NextResponse.json({ error: "Your profile was saved, but the account display name could not be refreshed." }, { status: 503 });

  return NextResponse.json({ saved: true, emailChangePending: email.toLowerCase() !== (user.email ?? "").toLowerCase() }, { headers: { "cache-control": "no-store" } });
}
