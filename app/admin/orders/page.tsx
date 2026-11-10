import { getAdminAccess } from "@/lib/admin/auth";
import { getAdminOrders, loadAdminData } from "@/lib/admin/data";
import { OrdersTable } from "@/components/admin/management";
export default async function AdminOrdersPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const result=await loadAdminData(()=>getAdminOrders(a.context.supabase));if(result.error)return <div className="admin-notice">Orders could not be loaded. Verify the checkout schema migration.</div>;return <OrdersTable initial={result.data}/>;}

