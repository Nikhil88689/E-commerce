"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AdminToastProvider, notifyAdmin } from "@/components/admin/admin-toast";
import { RouteTransition } from "@/components/motion/route-transition";
import { Activity, Archive, BarChart3, Boxes, ChevronDown, CircleDollarSign, Command, FileText, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Users, X } from "lucide-react";

const sections = [
  { label: "COMMAND", links: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  { label: "COMMERCE", links: [{ href: "/admin/products", label: "Products", icon: Package }, { href: "/admin/orders", label: "Orders", icon: ShoppingBag }, { href: "/admin/inventory", label: "Inventory", icon: Boxes }, { href: "/admin/customers", label: "Customers", icon: Users }, { href: "/admin/discounts", label: "Discounts", icon: CircleDollarSign }] },
  { label: "STUDIO", links: [{ href: "/admin/collections", label: "Collections", icon: Archive }, { href: "/admin/content", label: "Content", icon: FileText }, { href: "/admin/analytics", label: "Analytics", icon: BarChart3 }] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function signOut(){const response=await fetch("/api/auth/logout",{method:"POST"});if(!response.ok){notifyAdmin("Sign out failed. Try again.","error");return;}router.replace("/login");router.refresh();}
  return <AdminToastProvider><div className="admin-shell">
    {open && <button className="admin-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
      <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}><span className="admin-brand-mark">V</span><span>VANTA <small>COMMAND CENTER</small></span></Link>
      <div className="admin-sidebar-label">WORKSPACE <ChevronDown size={13} /></div>
      <nav aria-label="Admin navigation">
        {sections.map((section) => <div className="admin-nav-section" key={section.label}>
          <p>{section.label}</p>
          {section.links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} onClick={() => setOpen(false)} className={`admin-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={17} strokeWidth={1.7} /><span>{label}</span>{active && <i />}</Link>;
          })}
        </div>)}
      </nav>
      <div className="admin-sidebar-foot"><span className="admin-status-dot" /> SYSTEM OPERATIONAL</div><button className="admin-signout" onClick={signOut}><LogOut size={14}/> Sign out</button>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-mobile-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button><div className="admin-top-label"><Command size={14} /> ADMINISTRATION <span>/</span> {pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").toUpperCase() ?? "OVERVIEW"}</div><div className="admin-top-right"><span className="admin-live"><Activity size={13} /> LIVE DATA</span><span className="admin-avatar">VA</span></div></header>
      <div className="admin-content"><RouteTransition>{children}</RouteTransition></div>
    </main>
  </div></AdminToastProvider>;
}

export function AdminAccessMessage({ mode }: { mode: "unconfigured" | "forbidden" }) {
  return <main className="admin-access"><div className="admin-access-card"><span className="admin-kicker">VANTA / OPERATIONS</span><h1>{mode === "unconfigured" ? "Command center offline." : "Access restricted."}</h1><p>{mode === "unconfigured" ? "Connect the Supabase project, apply the admin command center migration, then grant the first administrator role from a trusted SQL session." : "This account does not have an administrator role. Admin roles are provisioned out of band by a project owner."}</p>{mode === "unconfigured" && <div className="admin-setup-steps"><code>1. Configure Supabase environment variables</code><code>2. Apply supabase/migrations/20261114000000_admin_command_center.sql</code><code>3. Insert your auth user into public.admin_roles as super_admin</code></div>}<Link href="/" className="admin-button admin-button-quiet">Return to storefront</Link></div></main>;
}

