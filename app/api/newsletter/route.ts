import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newsletterSchema } from "@/lib/validation/newsletter";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await checkPublicRateLimit(request, "newsletter");
  if (limit === "limited") return NextResponse.json({ message: "Too many signup attempts. Try again later." }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "3600" } });
  if (limit === "unavailable") return NextResponse.json({ message: "Newsletter signup is temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON body is required." }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email address and confirm your consent." }, { status: 400 });
  }

  if (parsed.data.company?.trim()) {
    return NextResponse.json({ message: "Signup received." }, { status: 202 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.NEXT_PUBLIC_PRIVACY_CONTACT
  ) {
    return NextResponse.json(
      { message: "Newsletter signup is not enabled until Supabase and a privacy contact are configured." },
      { status: 503 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: parsed.data.email.toLowerCase(),
      consented_at: new Date().toISOString(),
      consent_version: "v1",
    });

    if (error?.code === "23505") {
      return NextResponse.json({ alreadySubscribed: true }, { status: 200 });
    }
    if (error) {
      console.error("Newsletter signup failed:", error.message);
      return NextResponse.json({ message: "We couldn’t save your signup. Please try again later." }, { status: 502 });
    }

    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    console.error("Newsletter service unavailable:", error);
    return NextResponse.json({ message: "Newsletter signup is temporarily unavailable." }, { status: 503 });
  }
}
