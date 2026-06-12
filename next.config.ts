import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  transpilePackages: ["leaflet", "react-leaflet"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
