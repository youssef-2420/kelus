import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Canonical product intelligence requires the Cloudflare Worker runtime and
  // D1. Never switch production CI into Next.js static-export mode.
  trailingSlash: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
