import { getAdminAccess } from "@/lib/admin/auth";
import { getAdminInventory, loadAdminData } from "@/lib/admin/data";
import { InventoryManager } from "@/components/admin/management";
export default async function AdminInventoryPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const result=await loadAdminData(()=>getAdminInventory(a.context.supabase));if(result.error)return <div className="admin-notice">Inventory management is unavailable. Apply the command center migration.</div>;return <InventoryManager initial={result.data}/>;}

