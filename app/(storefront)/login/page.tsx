import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Sign In", description: "Sign in to your VANTA customer account.", path: "/login", noIndex: true });

function safeNextPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/account";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const notice = params.error === "confirmation" ? "That confirmation link is invalid or expired. Request a new one or sign in." : params.error === "unconfigured" ? "Supabase Auth is not configured for this deployment." : "";
  return <AuthForm mode="login" nextPath={safeNextPath(params.next)} notice={notice} />;
}
