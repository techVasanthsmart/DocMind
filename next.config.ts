import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio", "langchain", "@langchain/openai", "@langchain/community"],
};

export default nextConfig;
