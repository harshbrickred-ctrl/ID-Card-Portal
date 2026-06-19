import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load monorepo root .env when running from apps/portal (local dev + Vercel build)
loadEnvConfig(path.join(process.cwd(), "../.."));

const nextConfig: NextConfig = {
  transpilePackages: [
    "@idportal/api-kit",
    "@idportal/card-engine",
    "@idportal/contracts",
    "@idportal/db",
  ],
  serverExternalPackages: ["sharp", "bcryptjs", "pdf-to-png-converter", "pdfjs-dist"],
};

export default nextConfig;
