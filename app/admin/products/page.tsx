import { getAdminAccess } from "@/lib/admin/auth";
import { getAdminProducts, loadAdminData } from "@/lib/admin/data";
import { ProductTable } from "@/components/admin/management";
export default async function AdminProductsPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const result=await loadAdminData(()=>getAdminProducts(a.context.supabase));if(result.error)return <div className="admin-notice">Products are unavailable. Apply the command center migration and confirm the product schema.</div>;return <ProductTable initial={result.data}/>;}

