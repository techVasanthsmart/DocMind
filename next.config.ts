import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "pdf-parse",
    "pdfjs-dist",
  ],
  outputFileTracingIncludes: {
    "/api/ingest/route": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
