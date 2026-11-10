import { notFound } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/auth";
import { CustomerDetail } from "@/components/admin/management";
export default async function AdminCustomerPage({params}:{params:Promise<{id:string}>}){const a=await getAdminAccess();if(a.state!=="admin")return null;const {id}=await params;const [user,profile,orders,addresses]=await Promise.all([a.context.supabase.auth.admin.getUserById(id),a.context.supabase.from("profiles").select("*").eq("user_id",id).maybeSingle(),a.context.supabase.from("orders").select("*").eq("user_id",id).order("created_at",{ascending:false}),a.context.supabase.from("addresses").select("*").eq("user_id",id)]);if(user.error||!user.data.user)notFound();return <CustomerDetail initial={{user:user.data.user as unknown as Record<string,unknown>,profile:profile.data,orders:orders.data??[],addresses:addresses.data??[]}}/>;}

