import type { Metadata } from "next";
import { CustomerShell } from "@/components/account/customer-shell";
import { WishlistCollection } from "@/components/account/wishlist-collection";
import { getCustomerWishlist } from "@/lib/account/data";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Your Wishlist", description: "Products you have saved to your VANTA wishlist.", path: "/account/wishlist", noIndex: true });

export default async function AccountWishlistPage() {
  const { user, products } = await getCustomerWishlist();
  return <CustomerShell user={{ fullName: String(user.user_metadata.full_name ?? ""), email: user.email ?? "" }}>
    <section className="account-page-heading"><p className="eyebrow">Customer archive / Wishlist</p><h2>Noted for<br /><em>another day.</em></h2><p>A personal index of forms you may want to return to.</p></section>
    <WishlistCollection initialProducts={products} />
  </CustomerShell>;
}
