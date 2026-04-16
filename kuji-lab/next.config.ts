import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.35.60'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.1kuji.com" },
    ],
  },
};

export default nextConfig;
