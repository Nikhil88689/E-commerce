import { getAdminAccess } from "@/lib/admin/auth";
import { ContentManager } from "@/components/admin/management";
export default async function AdminCollectionsPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const [collections,products]=await Promise.all([a.context.supabase.from("collections").select("*").order("sort_order"),a.context.supabase.from("products").select("id,slug,name,collection_name,is_featured,featured_rank").order("featured_rank")]);if(collections.error||products.error)return <div className="admin-notice">Collections could not be loaded.</div>;return <ContentManager kind="collections" initial={collections.data??[]} products={products.data??[]}/>;}

