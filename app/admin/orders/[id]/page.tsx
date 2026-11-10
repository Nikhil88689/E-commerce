import { notFound } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/auth";
import { OrderDetail } from "@/components/admin/management";
export default async function AdminOrderPage({params}:{params:Promise<{id:string}>}){const a=await getAdminAccess();if(a.state!=="admin")return null;const {id}=await params;const [o,i,p,e]=await Promise.all([a.context.supabase.from("orders").select("*").eq("id",id).maybeSingle(),a.context.supabase.from("order_items").select("*").eq("order_id",id),a.context.supabase.from("payments").select("*").eq("order_id",id).maybeSingle(),a.context.supabase.from("order_events").select("*").eq("order_id",id).order("created_at",{ascending:false})]);if(o.error||!o.data)notFound();return <OrderDetail initial={{order:o.data,items:i.data??[],payment:p.data,events:e.data??[]}}/>;}

