import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@idportal/api-kit",
    "@idportal/card-engine",
    "@idportal/contracts",
    "@idportal/db",
  ],
  serverExternalPackages: ["sharp", "bcryptjs"],
};

export default nextConfig;
