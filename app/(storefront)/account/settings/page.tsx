import type { Metadata } from "next";
import { CustomerShell } from "@/components/account/customer-shell";
import { AccountSettings } from "@/components/account/account-settings";
import { requireCustomer } from "@/lib/auth/customer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Account Settings", description: "Manage your VANTA profile, password, delivery addresses, and preferences.", path: "/account/settings", noIndex: true });
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const query = await searchParams;
  const { user } = await requireCustomer("/account/settings");
  return <CustomerShell user={{ fullName: String(user.user_metadata.full_name ?? ""), email: user.email ?? "" }}>
    <section className="account-page-heading"><p className="eyebrow">Customer archive / Settings</p><h2>Made to fit<br /><em>your account.</em></h2><p>Adjust personal details, delivery addresses, and how VANTA gets in touch.</p></section>
    <AccountSettings passwordReset={query.password === "reset"} />
  </CustomerShell>;
}
