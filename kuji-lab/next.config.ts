import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.1kuji.com" },
    ],
  },
};

export default nextConfig;
