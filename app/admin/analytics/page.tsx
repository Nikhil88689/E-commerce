import { getAdminAccess } from "@/lib/admin/auth";
import { getAdminDashboardData, loadAdminData } from "@/lib/admin/data";
import { AnalyticsPage } from "@/components/admin/management";
export default async function AdminAnalyticsPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const result=await loadAdminData(()=>getAdminDashboardData(a.context.supabase));if(result.error)return <div className="admin-notice">Analytics could not be loaded. Apply the analytics and command center migrations.</div>;return <AnalyticsPage data={result.data}/>;}

