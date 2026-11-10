import { notFound } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/auth";
import { ProductEditor } from "@/components/admin/management";
export default async function EditAdminProductPage({params}:{params:Promise<{id:string}>}){const a=await getAdminAccess();if(a.state!=="admin")return null;const {id}=await params;const {data,error}=await a.context.supabase.from("products").select("*").eq("id",id).maybeSingle();if(error||!data)notFound();const {data:variants}=await a.context.supabase.from("product_variants").select("*").eq("product_id",id).order("sort_order");return <ProductEditor product={{...data,product_variants:variants??[]}}/>;}

