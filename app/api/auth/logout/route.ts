import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ signedOut: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Sign out is unavailable until Supabase Auth is configured." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
