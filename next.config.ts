import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/kelus" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/kelus/" : undefined,
  trailingSlash: true,
};

export default nextConfig;
