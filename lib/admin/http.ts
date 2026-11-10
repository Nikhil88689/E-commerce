import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin/auth";

export async function requireAdminResponse() {
  const access = await getAdminAccess();
  if (access.state === "admin") return { access, response: null } as const;
  const status = access.state === "anonymous" ? 401 : access.state === "forbidden" ? 403 : 503;
  const message = access.state === "anonymous" ? "Sign in to an administrator account." : access.state === "forbidden" ? "Administrator access is required." : "Admin services are not configured. Apply the VANTA admin migration and configure Supabase credentials.";
  return { access: null, response: NextResponse.json({ error: message }, { status }) } as const;
}

export function adminError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request) {
  try { return await request.json(); }
  catch { throw new Error("Request body must be valid JSON."); }
}
