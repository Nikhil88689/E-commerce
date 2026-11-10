import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CartSync } from "@/components/cart/cart-sync";
import { RouteTransition } from "@/components/motion/route-transition";
import "./catalog.css";
import "./product-studio.css";
import "./checkout.css";
import "./account.css";
import "./editorial.css";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <CartSync />
      <RouteTransition>{children}</RouteTransition>
      <SiteFooter />
    </>
  );
}
