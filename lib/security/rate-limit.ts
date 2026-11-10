import { createHash } from "node:crypto";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type PublicRateBucket = "checkout" | "quote" | "newsletter" | "drop-notify" | "search" | "cart";
export type RateLimitResult = "allowed" | "limited" | "unavailable" | "unconfigured";

function clientAddress(request: Request) {
  const edgeIp = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (edgeIp) return edgeIp.slice(0, 100);
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 100);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.at(-1)?.slice(0, 100) || "unknown";
}

export async function checkPublicRateLimit(request: Request, bucket: PublicRateBucket): Promise<RateLimitResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "unconfigured";
  if (!isSupabaseAdminConfigured()) return "unavailable";
  const keyHash = createHash("sha256").update(`${bucket}:${clientAddress(request)}`).digest("hex");
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("consume_public_rate_limit", { p_bucket: bucket, p_key_hash: keyHash });
    if (error) {
      console.error("Public request limit check failed", { bucket, code: error.code });
      return "unavailable";
    }
    return data ? "allowed" : "limited";
  } catch (error) {
    console.error("Public request limit service unavailable", { bucket, error });
    return "unavailable";
  }
}
