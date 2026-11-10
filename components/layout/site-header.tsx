"use client";

import { Menu, Minus, Plus, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCheckoutQuote } from "@/hooks/use-checkout-quote";
import { MegaMenu, type MegaMenuKey } from "@/components/navigation/mega-menu";
import { SearchDialog } from "@/components/navigation/search-dialog";
import { Modal } from "@/components/ui/modal";
import { useCartStore } from "@/state/cart-store";

const navigation: Array<{ label: string; key: MegaMenuKey }> = [
  { label: "Discover", key: "discover" },
  { label: "Collections", key: "collections" },
  { label: "Drops", key: "drops" },
  { label: "Stories", key: "stories" },
];

export function SiteHeader() {
  const [activeMenu, setActiveMenu] = useState<MegaMenuKey | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountSession, setAccountSession] = useState<{ configured: boolean; user: { email?: string; fullName?: string } | null } | null>(null);
  const cartHydrated = useCartHydration();
  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const { quote, loading: quoteLoading } = useCheckoutQuote(cartItems, "standard", "");
  const itemCount = cartHydrated ? cartItems.reduce((total, item) => total + item.quantity, 0) : 0;

  useEffect(() => {
    if (!accountOpen) return;
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((value: { configured?: boolean; user?: { email?: string; fullName?: string } | null }) => {
      if (active) setAccountSession({ configured: value.configured === true, user: value.user ?? null });
    }).catch(() => {
      if (active) setAccountSession({ configured: false, user: null });
    });
    return () => { active = false; };
  }, [accountOpen]);

  function openMenu(menu: MegaMenuKey) {
    if (mobileOpen) {
      setMobileOpen(false);
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
      window.setTimeout(() => setActiveMenu(menu), delay);
    } else {
      setActiveMenu(menu);
    }
  }

  function openFromMobile(action: () => void) {
    setMobileOpen(false);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
    window.setTimeout(action, delay);
  }

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" href="/">
          <span className="wordmark__glyph" aria-hidden="true">V</span>
          <span>VANTA</span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className="site-nav__item"
              data-cursor-label="EXPLORE"
              aria-haspopup="dialog"
              aria-expanded={activeMenu === item.key}
              onClick={() => setActiveMenu(activeMenu === item.key ? null : item.key)}
            >
              {item.label}
              <span className="site-nav__indicator" aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="header-action header-action--search" type="button" aria-label="Search" data-cursor-label="SEARCH" onClick={() => setSearchOpen(true)}>
            <Search aria-hidden="true" size={16} strokeWidth={1.4} />
            <span>Search</span>
          </button>
          <button className="header-action header-action--account" type="button" data-cursor-label="ACCOUNT" onClick={() => setAccountOpen(true)}>
            <UserRound aria-hidden="true" size={16} strokeWidth={1.4} />
            <span>Account</span>
          </button>
          <button
            className="header-action header-action--bag"
            data-cursor-label="BAG"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Shopping bag, ${itemCount} items`}
          >
            <ShoppingBag aria-hidden="true" size={16} strokeWidth={1.4} />
            <span>Bag</span>
            <span className="bag-count" aria-live="polite">{itemCount}</span>
          </button>
        </div>

        <button
          className="mobile-menu-toggle"
          data-cursor-label={mobileOpen ? "CLOSE" : "MENU"}
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </header>

      <MegaMenu menu={activeMenu} onClose={() => setActiveMenu(null)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Modal open={cartOpen} onOpenChange={setCartOpen} title="The VANTA bag" variant="drawer" className="cart-dialog">
        {cartItems.length > 0 ? (
          <div className="cart-drawer__items">
            {cartItems.map((item) => {
              const line = quote?.items.find((entry) => entry.cartItemRefs.some((ref) => ref.variantId === item.variantId));
              const stock = line?.stockQuantity ?? 50;
              return <div className="cart-drawer__item" key={item.variantId}>
                <span>{item.name}<small>{line ? new Intl.NumberFormat("en-US", { style: "currency", currency: line.currency, maximumFractionDigits: 0 }).format(line.unitAmountCents / 100) : "Refreshing server price"} · demo item</small>{item.configuration ? <small className="cart-drawer__configuration">{item.configuration.summary}</small> : null}</span>
                <span className="cart-drawer__controls"><span className="cart-drawer__quantity"><button type="button" aria-label={`Reduce ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1}><Minus size={11} aria-hidden="true" /></button>{item.quantity}<button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= Math.min(stock, 50)}><Plus size={11} aria-hidden="true" /></button></span><button className="cart-drawer__remove" type="button" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.variantId)}><Trash2 size={13} aria-hidden="true" /></button></span>
              </div>;
            })}
            <div className="cart-drawer__subtotal"><span>{quoteLoading || !quote ? "Refreshing subtotal" : "Subtotal / sample estimate"}</span><strong>{quote ? new Intl.NumberFormat("en-US", { style: "currency", currency: quote.currency, maximumFractionDigits: 0 }).format(quote.subtotalCents / 100) : "—"}</strong></div>
            <p className="cart-drawer__notice">Sample pricing and stock. Payment runs through secure Stripe test checkout.</p>
            <Link className="button button--primary cart-drawer__checkout" href="/cart" onClick={() => setCartOpen(false)}>View bag <span aria-hidden="true">↗</span></Link>
            <Link className={`cart-drawer__checkout-link${!quote ? " is-disabled" : ""}`} href={quote ? "/checkout" : "/cart"} onClick={() => setCartOpen(false)}>Continue to checkout <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="cart-drawer__empty">
            <span className="cart-drawer__ring" aria-hidden="true" />
            <p className="eyebrow">A clear beginning</p>
            <h3>Your bag is empty.</h3>
            <p>Sample products from Discover can be added to your bag. Your selections stay saved on this device.</p>
            <Link className="button button--outline" href="/discover" onClick={() => setCartOpen(false)}>
              Browse the demo catalog
            </Link>
          </div>
        )}
      </Modal>

      <Modal open={accountOpen} onOpenChange={setAccountOpen} title="Your VANTA account" variant="drawer" className="account-dialog">
        <div className="account-drawer__body">
          <p className="eyebrow">Customer access / Private account</p>
          <h3>Your archive,<br /><em>held close.</em></h3>
          {!accountSession ? <p role="status">Preparing your private account access.</p> : !accountSession.configured ? <><p>Customer accounts are not enabled for this deployment yet.</p><Link className="button button--outline" href="/#newsletter" onClick={() => setAccountOpen(false)}>Get launch notes</Link></> : accountSession.user ? <><p>Signed in as {accountSession.user.email}. Review orders, saved forms, and delivery details.</p><Link className="button button--primary" href="/account" onClick={() => setAccountOpen(false)}>Open your account</Link><Link className="account-drawer__secondary" href="/account/orders" onClick={() => setAccountOpen(false)}>View order history <span aria-hidden="true">→</span></Link></> : <><p>Keep your orders, saved forms, and studio work together in a private account.</p><Link className="button button--primary" href="/login" onClick={() => setAccountOpen(false)}>Sign in</Link><Link className="account-drawer__secondary" href="/register" onClick={() => setAccountOpen(false)}>Create an account <span aria-hidden="true">→</span></Link></>}
        </div>
      </Modal>

      <Modal open={mobileOpen} onOpenChange={setMobileOpen} title="Explore VANTA" variant="drawer" className="mobile-nav-dialog">
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <button key={item.key} type="button" onClick={() => openMenu(item.key)}>
              <span>{item.label}</span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
          <button type="button" onClick={() => openFromMobile(() => setSearchOpen(true))}>
            <span>Search the archive</span><Search aria-hidden="true" size={17} />
          </button>
          <button type="button" onClick={() => openFromMobile(() => setAccountOpen(true))}>
            <span>Account</span><UserRound aria-hidden="true" size={17} />
          </button>
          <button type="button" onClick={() => openFromMobile(() => setCartOpen(true))}>
            <span>Shopping bag</span><span className="bag-count">{itemCount}</span>
          </button>
        </nav>
      </Modal>
    </>
  );
}
