import type { NextConfig } from "next";

const useRepositoryPath = process.env.GITHUB_ACTIONS === "true" && process.env.KELUS_CUSTOM_DOMAIN !== "true";

const nextConfig: NextConfig = {
  // GitHub Pages remains a static fallback. The production Sites deployment
  // keeps its server runtime so canonical product pages can read D1 snapshots.
  output: process.env.GITHUB_ACTIONS === "true" ? "export" : undefined,
  basePath: useRepositoryPath ? "/kelus" : "",
  assetPrefix: useRepositoryPath ? "/kelus/" : undefined,
  trailingSlash: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
