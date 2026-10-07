import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // The dev-only "N" bubble sits where the phone tab bar is; errors are still shown in development.
  devIndicators: false,
};

export default nextConfig;
