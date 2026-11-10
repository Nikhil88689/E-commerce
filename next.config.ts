import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 80, 82, 84],
    remotePatterns: supabaseUrl ? [{
      protocol: supabaseUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: supabaseUrl.hostname,
      port: supabaseUrl.port,
      pathname: "/storage/v1/object/public/**",
    }] : [],
  },
};

export default nextConfig;
