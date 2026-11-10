import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dropNotificationSchema } from "@/lib/validation/drop-notification";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function failure(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const limit = await checkPublicRateLimit(request, "drop-notify");
  if (limit === "limited") return failure("Too many release signup attempts. Try again later.", 429);
  if (limit === "unavailable") return failure("Release notifications are temporarily unavailable.", 503);
  const payload = await request.json().catch(() => null);
  const parsed = dropNotificationSchema.safeParse(payload);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Review your email and consent.", 400);
  if (parsed.data.company.trim()) return NextResponse.json({ saved: true }, { status: 202, headers: { "cache-control": "no-store" } });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.NEXT_PUBLIC_PRIVACY_CONTACT) {
    return failure("Drop notifications are not enabled until VANTA database and privacy settings are configured.", 503);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: drop, error: dropError } = await supabase.from("drops").select("slug").eq("slug", parsed.data.dropSlug).eq("is_published", true).eq("notify_enabled", true).maybeSingle();
    if (dropError || !drop) return failure("Notifications are not available for this release.", 404);
    const { error } = await supabase.from("drop_notifications").insert({
      drop_slug: drop.slug,
      email: parsed.data.email.toLowerCase(),
      consented_at: new Date().toISOString(),
    });
    if (error?.code === "23505") return NextResponse.json({ saved: true, alreadySubscribed: true }, { headers: { "cache-control": "no-store" } });
    if (error) return failure("Your release request could not be saved. Please try again.", 503);
    return NextResponse.json({ saved: true }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return failure("Drop notifications are temporarily unavailable.", 503);
  }
}
