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
    "Enter a URL and start chatting with its content. Powered by LangChain & OpenAI. Open Source. No login required.",
  keywords: [
    "RAG",
    "Chat with Website",
    "AI",
    "OpenAI",
    "LangChain",
    "Next.js",
    "DocMind",
    "Documentation Assistant",
  ],
  authors: [{ name: "Vasanth Kumar", url: "https://techvasanthsmart.github.io" }],
  creator: "Vasanth Kumar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://docmind.vercel.app",
    title: "DocMind - Chat with Any Website",
    description:
      "Turn any website into a chatbot. Instant answers, grounded sources, and no login required.",
    siteName: "DocMind",
    images: ["/og-image.png"], // You should add an og-image.png to public/
  },
  twitter: {
    card: "summary_large_image",
    title: "DocMind - Chat with Any Website",
    description:
      "Turn any website into a chatbot. Instant answers, grounded sources, and no login required.",
    creator: "@techVasanthsmart",
  },
  verification: {
    google: "google-site-verification-code", // Replace with actual code
  },
  icons: {
    icon: "/icon.svg",
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
