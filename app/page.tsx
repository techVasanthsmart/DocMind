"use client";

import { useState } from "react";
import URLInput from "./components/URLInput";
import ChatInterface from "./components/ChatInterface";
import { Brain, Sparkles, Shield, Zap } from "lucide-react";

export default function Home() {
  const [ingested, setIngested] = useState<{
    url: string;
    chunkCount: number;
    documentCount: number;
  } | null>(null);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/40 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-200/30 rounded-full blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 px-4 py-8">
        {!ingested ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
            {/* Hero */}
            <div className="text-center space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Powered by LangChain & OpenAI
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                Chat with any website
              </h1>
              <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                Enter a URL, and our AI will scrape, index, and let you ask
                questions — with{" "}
                <span className="font-semibold text-indigo-600">
                  zero hallucination
                </span>{" "}
                and full source transparency.
              </p>
            </div>

            {/* URL Input */}
            <URLInput onIngested={setIngested} />

            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-xl">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 text-sm text-gray-700 shadow-sm">
                <Shield className="w-4 h-4 text-emerald-500" />
                Anti-Hallucination
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 text-sm text-gray-700 shadow-sm">
                <Brain className="w-4 h-4 text-indigo-500" />
                Evaluation Metrics
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100 text-sm text-gray-700 shadow-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                Source Citations
              </div>
            </div>
          </div>
        ) : (
          <ChatInterface
            ingestedUrl={ingested.url}
            chunkCount={ingested.chunkCount}
          />
        )}
      </div>
    </main>
  );
}
