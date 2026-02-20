import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "./components/Footer";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://docmind.vercel.app"),
  title: {
    default: "DocMind - Chat with Any Website",
    template: "%s | DocMind",
  },
  description:
    "Chat with any website instantly using DocMind. The ultimate AI-powered RAG tool for research, analysis, and documentation. Built by Vasanth Kumar. Open Source & No Login.",
  keywords: [
    "DocMind",
    "RAG",
    "Chat with Website",
    "AI Research Assistant",
    "Document Analysis",
    "Web Scraper",
    "Artificial Intelligence",
    "Machine Learning",
    "LangChain",
    "OpenAI",
    "Next.js",
    "PDF Chat",
    "Vasanth Kumar",
    "Vasanthubs",
  ],
  authors: [{ name: "Vasanth Kumar", url: "https://vasanthubs.co.in/" }],
  creator: "Vasanth Kumar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://docmind.vercel.app",
    title: "DocMind - Chat with Any Website | AI Research Tool",
    description:
      "Transform any URL into an interactive chatbot. Get instant answers with source citations. 100% Free & Open Source. Built by Vasanth Kumar.",
    siteName: "DocMind",
    images: ["/og-image.png"], // You should add an og-image.png to public/
  },
  twitter: {
    card: "summary_large_image",
    title: "DocMind - Chat with Any Website | AI Research Tool",
    description:
      "Transform any URL into an interactive chatbot. Get instant answers with source citations. 100% Free & Open Source. Built by Vasanth Kumar.",
    creator: "@techVasanthsmart",
  },
  verification: {
    google: "MtTZgPguua5yFv3AybdrNJ-yHwwfKj3dg4v2q_OHccg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <main className="flex-grow">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
