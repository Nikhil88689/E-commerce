import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerContext = { supabase: SupabaseClient; user: User };
export type CustomerLookup =
  | { state: "authenticated"; context: CustomerContext }
  | { state: "anonymous" }
  | { state: "unconfigured" };

export async function getCustomerContext(): Promise<CustomerLookup> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { state: "unconfigured" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { state: "anonymous" };
    return { state: "authenticated", context: { supabase, user } };
  } catch {
    return { state: "unconfigured" };
  }
}

export async function requireCustomer(next = "/account"): Promise<CustomerContext> {
  const lookup = await getCustomerContext();
  if (lookup.state !== "authenticated") redirect(`/login?next=${encodeURIComponent(next)}`);
  return lookup.context;
}
