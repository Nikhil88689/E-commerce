const vercelHost = process.env.VERCEL_URL?.trim();
const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteConfig = {
  name: "VANTA",
  title: "The Future of Commerce",
  description: "A considered space for objects, ideas, and the next expression of design.",
  url: configuredUrl || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
} as const;
