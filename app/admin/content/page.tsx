import { getAdminAccess } from "@/lib/admin/auth";
export default async function AdminContentPage(){const a=await getAdminAccess();if(a.state!=="admin")return null;const [stories,drops,sections]=await Promise.all([a.context.supabase.from("stories").select("*").order("sort_order"),a.context.supabase.from("drops").select("*").order("sort_order"),a.context.supabase.from("homepage_sections").select("*").order("sort_order")]);if(stories.error||drops.error||sections.error)return <div className="admin-notice">Editorial content is unavailable. Apply the editorial and command center migrations.</div>;return <ContentTabs stories={stories.data??[]} drops={drops.data??[]} sections={sections.data??[]}/>;}
import { ContentTabs } from "@/components/admin/content-tabs";

