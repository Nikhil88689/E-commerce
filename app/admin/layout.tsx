import { redirect } from "next/navigation";
import { AdminAccessMessage, AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccess } from "@/lib/admin/auth";
import "./admin.css";

export const metadata = { title: "Command Center | VANTA", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await getAdminAccess();
  if (access.state === "anonymous") redirect("/login?next=%2Fadmin");
  if (access.state === "forbidden" || access.state === "unconfigured") return <AdminAccessMessage mode={access.state} />;
  return <AdminShell>{children}</AdminShell>;
}

