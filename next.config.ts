import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "pdf-parse",
    "canvas",
  ],
  outputFileTracingIncludes: {
    "/api/ingest": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/canvas/**/*",
    ],
  },
};

export default nextConfig;
