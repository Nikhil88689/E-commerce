"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

const privacyContact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT;
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
const pinterestUrl = process.env.NEXT_PUBLIC_PINTEREST_URL;

export function SiteFooter() {
  const [legalOpen, setLegalOpen] = useState<"privacy" | "terms" | null>(null);

  return (
    <>
      <footer className="site-footer" id="footer">
        <div className="site-footer__top">
          <Link className="wordmark" href="/">
            <span className="wordmark__glyph" aria-hidden="true">V</span>
            <span>VANTA</span>
          </Link>
          <p className="site-footer__thought">A considered beginning.<br /><em>More, when it’s ready.</em></p>
          <Link className="site-footer__back" href="/#top" aria-label="Back to the top">
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="site-footer__columns">
          <div className="site-footer__column">
            <p className="eyebrow">Explore</p>
            <Link href="/#concepts">Concept archive</Link>
            <Link href="/#worlds">Product worlds</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/drops">Release signals</Link>
            <Link href="/stories">VANTA journal</Link>
          </div>
          <div className="site-footer__column">
            <p className="eyebrow">The VANTA note</p>
            <Link href="/#newsletter">Join the interest list</Link>
            {supportEmail ? <a href={`mailto:${supportEmail}`}>Customer support</a> : <span>Support details before launch</span>}
            <button type="button" onClick={() => setLegalOpen("privacy")}>Privacy notice</button>
            <button type="button" onClick={() => setLegalOpen("terms")}>Concept archive terms</button>
          </div>
          <div className="site-footer__column site-footer__socials">
            <p className="eyebrow">Elsewhere</p>
            {instagramUrl ? <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram <ArrowUpRight aria-hidden="true" size={12} /></a> : <span>Instagram / announced later</span>}
            {pinterestUrl ? <a href={pinterestUrl} target="_blank" rel="noreferrer">Pinterest <ArrowUpRight aria-hidden="true" size={12} /></a> : <span>Pinterest / announced later</span>}
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© VANTA</span>
          <span>Concept archive · No products currently for sale</span>
          <span>Built for what comes next</span>
        </div>
      </footer>

      <Modal
        open={legalOpen !== null}
        onOpenChange={(open) => !open && setLegalOpen(null)}
        title={legalOpen === "privacy" ? "Privacy notice" : "Concept archive terms"}
        variant="dialog"
        className="legal-dialog"
      >
        {legalOpen === "privacy" ? (
          <div className="legal-copy">
            <p className="eyebrow">Preview / VANTA concept archive</p>
            <p>When account access is enabled, authentication is handled by Supabase and profile, address, wishlist, and order records are stored in the configured VANTA project. Drop-notification email addresses are stored with the requested release and its consent timestamp.</p>
            <p>Checkout is a test-mode demonstration. No products ship, and no live retail sale is offered. If newsletter signup is enabled, the email address and consent timestamp are stored in Supabase; marketing messages are not sent until an email delivery service is connected.</p>
            {privacyContact ? <p>To ask about or remove a signup, contact <a href={`mailto:${privacyContact}`}>{privacyContact}</a>.</p> : <p>A privacy contact must be configured before newsletter signup can be enabled.</p>}
          </div>
        ) : (
          <div className="legal-copy">
            <p className="eyebrow">Concept archive / Preview</p>
            <p>Images and names on this site are visual design studies. Sample catalog prices and inventory support a test checkout and do not represent an offer to sell or a promise of fulfillment.</p>
            <p>Checkout uses Stripe test mode when configured. Test payments do not ship products. Live sales require published retail, shipping, return, and privacy terms before launch.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
