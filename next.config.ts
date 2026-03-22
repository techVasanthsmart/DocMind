import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "pdf-parse",
    "canvas",
    "pdfjs-dist",
  ],
  outputFileTracingIncludes: {
    "/api/ingest/route": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/pdf-parse/**/*",
      "./node_modules/canvas/**/*",
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
};

export default nextConfig;
