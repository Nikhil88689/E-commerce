import { getAdminAccess } from "@/lib/admin/auth";
import { DiscountsManager } from "@/components/admin/management";
export default async function AdminDiscountsPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const {data,error}=await a.context.supabase.from("discounts").select("*").order("created_at",{ascending:false});if(error)return <div className="admin-notice">Discounts could not be loaded.</div>;return <DiscountsManager initial={data??[]}/>;}

