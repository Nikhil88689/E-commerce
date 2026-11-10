"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Box, Heart, LogOut, Settings2, UserRound } from "lucide-react";

const customerLinks = [
  { href: "/account", label: "Overview", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: Box },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/settings", label: "Settings", icon: Settings2 },
];

export function CustomerShell({ user, children }: { user: { fullName: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = user.fullName.trim().split(/\s+/)[0] || user.email.split("@")[0] || "Customer";

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally { setSigningOut(false); }
  }

  return <main id="main-content" className="customer-area">
    <div className="customer-area__masthead"><Link href="/discover"><ArrowLeft size={13} aria-hidden="true" /> VANTA / THE COLLECTION</Link><span>PRIVATE ACCOUNT / 01</span></div>
    <header className="customer-area__welcome"><div><p className="eyebrow">Your VANTA / Customer space</p><h1>Good to have<br /><em>you, {firstName}.</em></h1></div><div className="customer-area__identity"><span>{user.fullName || user.email}</span><small>{user.email}</small></div></header>
    <div className="customer-layout">
      <aside className="customer-nav" aria-label="Customer account">
        <p className="eyebrow">Your account</p>
        <nav>{customerLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`)) ? "page" : undefined}><Icon size={15} aria-hidden="true" /><span>{label}</span><ArrowRight size={12} aria-hidden="true" /></Link>)}</nav>
        <button className="customer-nav__logout" type="button" disabled={signingOut} onClick={signOut}><LogOut size={14} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button>
        <Link className="customer-nav__return" href="/discover">Return to the archive <ArrowRight size={12} aria-hidden="true" /></Link>
      </aside>
      <div className="customer-content">{children}</div>
    </div>
  </main>;
}
