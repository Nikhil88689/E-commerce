import Link from "next/link";
import { ArrowUpRight, Boxes, CircleDollarSign, Package, ShoppingBag, Users } from "lucide-react";
import { AdminNotice } from "@/components/admin/management";
import { getAdminAccess } from "@/lib/admin/auth";
import { getAdminDashboardData, loadAdminData } from "@/lib/admin/data";

const money = (cents: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const day = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default async function AdminOverviewPage() {
  const access = await getAdminAccess();
  if (access.state !== "admin") return null;

  const result = await loadAdminData(() => getAdminDashboardData(access.context.supabase));
  if (result.error) {
    return <><div className="admin-heading-row"><div><div className="admin-eyebrow">VANTA / OPERATIONS</div><h1>Command center</h1></div></div><div className="admin-notice">Analytics data could not be loaded. Apply the catalog, checkout, customer account, editorial and command center migrations, then verify Supabase access.</div></>;
  }

  const data = result.data;
  const max = Math.max(1, ...data.trend.map((point) => point.revenueCents));
  const stats = [
    { label: "Paid revenue", value: money(data.revenueCents), note: `${data.paidOrders} settled orders`, icon: CircleDollarSign },
    { label: "Orders", value: String(data.totalOrders), note: "All recorded orders", icon: ShoppingBag },
    { label: "Average order", value: money(data.averageOrderValueCents), note: "Paid orders only", icon: ArrowUpRight },
    { label: "Customers", value: String(data.customers), note: "Registered profiles", icon: Users },
  ];

  return <>
    <div className="admin-heading-row"><div><div className="admin-eyebrow">VANTA / OPERATIONS</div><h1>Command center</h1><p>Store performance, catalog signals and fulfillment activity from your database.</p></div><div className="admin-actions"><span className="admin-badge good">LIVE DATABASE</span></div></div>
    <div className="admin-grid admin-stat-grid">{stats.map(({ label, value, note, icon: Icon }) => <div className="admin-panel admin-stat" key={label}><div className="admin-stat-label">{label}<Icon size={15}/></div><div className="admin-stat-value">{value}</div><div className="admin-stat-note">{note}</div></div>)}</div>
    <div className="admin-grid admin-overview-grid">
      <section className="admin-panel admin-panel-pad"><h2 className="admin-section-title">Revenue signal <small>LAST 30 DAYS / PAID</small></h2><div className="admin-chart" role="img" aria-label="Paid revenue trend, last 30 days">{data.trend.map((point) => <div key={point.date} className="admin-chart-bar" style={{ height: `${Math.max(2, (point.revenueCents / max) * 100)}%`, opacity: point.revenueCents ? 0.9 : 0.2 }} title={`${day(point.date)} / ${money(point.revenueCents)} / ${point.orders} orders`}/>)}</div><div className="admin-chart-labels"><span>{day(data.trend[0].date)}</span><span>{day(data.trend[14].date)}</span><span>{day(data.trend.at(-1)!.date)}</span></div></section>
      <section className="admin-panel admin-panel-pad"><h2 className="admin-section-title">Inventory alerts <small>{data.inventoryAlerts.length} LOW</small></h2>{data.inventoryAlerts.map((product) => <div className="admin-list-row" key={product.id}><div className="admin-list-main"><b>{product.name}</b><span>{product.is_published ? "Published" : "Draft"} / {product.category_slug}</span></div><div className="admin-list-value"><span className={`admin-badge ${Number(product.stock_quantity) === 0 ? "bad" : "warn"}`}>{product.stock_quantity} left</span></div></div>)}{!data.inventoryAlerts.length && <div className="admin-empty"><strong>Inventory is clear</strong>No stock rows are currently at four units or below.</div>}<Link className="admin-button admin-button-quiet admin-button-small" href="/admin/inventory" style={{ marginTop: 10 }}>Open inventory <Boxes size={12}/></Link></section>
    </div>
    <div className="admin-grid admin-overview-grid" style={{ marginTop: 14 }}>
      <section className="admin-panel admin-panel-pad"><h2 className="admin-section-title">Recent orders <small>{data.totalOrders} TOTAL</small></h2>{data.recentOrders.map((order) => <Link className="admin-list-row" href={`/admin/orders/${order.id}`} key={order.id}><div className="admin-list-main"><b>{order.order_number ?? String(order.id).slice(0, 8)}</b><span>{order.email ?? "Guest"} / {new Date(order.created_at).toLocaleDateString()}</span></div><div className="admin-list-value"><b>{money(Number(order.total_cents))}</b><span className="admin-muted">{order.fulfillment_status}</span></div></Link>)}{!data.recentOrders.length && <div className="admin-empty"><strong>No orders recorded</strong>Orders will appear after checkout is connected to this Supabase project.</div>}<Link className="admin-button admin-button-quiet admin-button-small" href="/admin/orders" style={{ marginTop: 10 }}>All orders <ShoppingBag size={12}/></Link></section>
      <section className="admin-panel admin-panel-pad"><h2 className="admin-section-title">Best sellers <small>PAID UNITS</small></h2>{data.bestSellers.map((item, index) => <div className="admin-list-row" key={item.slug}><div className="admin-list-main"><b><span style={{ color: "#bda27b", marginRight: 8, fontFamily: "var(--font-mono)" }}>0{index + 1}</span>{item.name}</b><span>{item.units} units sold</span></div><div className="admin-list-value"><b>{money(item.revenueCents)}</b></div></div>)}{!data.bestSellers.length && <div className="admin-empty"><strong>No best sellers yet</strong>Paid order line items will appear here.</div>}<Link className="admin-button admin-button-quiet admin-button-small" href="/admin/products" style={{ marginTop: 10 }}>Catalog <Package size={12}/></Link></section>
    </div>
    <div style={{ marginTop: 14 }}><AdminNotice message={data.conversion ? `Tracked sessions (last 30 days): ${data.conversion.sessions.toLocaleString()} page-view sessions, ${data.conversion.checkoutSessions.toLocaleString()} checkout starts, ${data.conversion.purchases.toLocaleString()} purchase sessions.` : "Conversion metrics are unavailable until real storefront page-view and checkout tracking events are recorded."}/></div>
  </>;
}
