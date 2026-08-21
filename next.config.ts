import type { NextConfig } from "next";

const useRepositoryPath = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: useRepositoryPath ? "/kelus" : "",
  assetPrefix: useRepositoryPath ? "/kelus/" : undefined,
  trailingSlash: true,
};

export default nextConfig;
