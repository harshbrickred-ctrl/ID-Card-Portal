import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load monorepo root .env when running from apps/portal (local dev + Vercel build)
const monorepoRoot = path.join(process.cwd(), "../..");
loadEnvConfig(monorepoRoot);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@idportal/api-kit",
    "@idportal/card-engine",
    "@idportal/contracts",
    "@idportal/db",
  ],
  serverExternalPackages: [
    "sharp",
    "bcryptjs",
    "pdf-to-png-converter",
    "pdfjs-dist",
    "@napi-rs/canvas",
  ],
  // Hoisted deps live at monorepo root — include them in serverless traces (pdfjs cmaps/fonts).
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/pdfjs-dist/**",
      "../../node_modules/pdf-to-png-converter/**",
      "../../node_modules/@napi-rs/canvas/**",
      "../../node_modules/@napi-rs/canvas-*/**",
    ],
  },
};

export default nextConfig;
