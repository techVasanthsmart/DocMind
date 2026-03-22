import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "pdf-parse",
  ],
  outputFileTracingIncludes: {
    "/api/ingest/route": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/pdf-parse/**/*",
    ],
  },
};

export default nextConfig;
