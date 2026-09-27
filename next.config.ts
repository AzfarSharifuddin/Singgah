import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    minimumCacheTTL: 60,
    remotePatterns: supabaseUrl ? [{
      protocol: "https",
      hostname: new URL(supabaseUrl).hostname,
      pathname: "/storage/v1/object/sign/vendor-media/**",
    }] : [],
  },
};

export default nextConfig;
