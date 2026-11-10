import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminContext = { user: User; supabase: SupabaseClient };
export type AdminAccess =
  | { state: "admin"; context: AdminContext }
  | { state: "anonymous" }
  | { state: "forbidden" }
  | { state: "unconfigured" };

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { state: "unconfigured" };
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) return { state: "anonymous" };
    const { data: role, error: roleError } = await sessionClient.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleError) return { state: "unconfigured" };
    if (!role || !["admin", "super_admin"].includes(String(role.role))) return { state: "forbidden" };
    return { state: "admin", context: { user, supabase: createSupabaseAdminClient() } };
  } catch {
    return { state: "unconfigured" };
  }
}
