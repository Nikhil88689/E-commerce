import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Mono, Manrope } from "next/font/google";
import { DesktopCursor } from "@/components/motion/desktop-cursor";
import { siteConfig } from "@/lib/config/site";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-vanta-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-vanta-editorial",
});
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-vanta-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "VANTA — The Future of Commerce",
    template: "%s — VANTA",
  },
  description:
    "A future-facing concept archive for objects, ideas, and the space between them.",
  applicationName: "VANTA",
  openGraph: {
    type: "website",
    siteName: "VANTA",
    title: "VANTA / The Future of Commerce",
    description: "A future-facing concept archive for objects, ideas, and the space between them.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "VANTA / The Future of Commerce" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VANTA / The Future of Commerce",
    description: "A future-facing concept archive for objects, ideas, and the space between them.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#11110f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${cormorant.variable} ${dmMono.variable}`}>
        {children}
        <DesktopCursor />
      </body>
    </html>
  );
}
