"use client";

import { useState } from "react";
import { Globe, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface URLInputProps {
  onIngested: (data: {
    url: string;
    chunkCount: number;
    documentCount: number;
  }) => void;
}

export default function URLInput({ onIngested }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [success, setSuccess] = useState<{
    chunkCount: number;
    documentCount: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setSuccess(null);
    setSteps([]);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok && !response.body) {
         const data = await response.json();
         throw new Error(data.error || "Failed to ingest URL");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to start stream");

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
            const text = decoder.decode(value);
            const lines = text.split("\n").filter(line => line.trim() !== "");
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.step) {
                        setSteps(prev => [...prev, data.step]);
                    }
                    if (data.success) {
                        setSuccess({
                            chunkCount: data.chunkCount,
                            documentCount: data.documentCount,
                        });
                        onIngested({
                            url: url.trim(),
                            chunkCount: data.chunkCount,
                            documentCount: data.documentCount,
                        });
                        setLoading(false);
                        return; // Done
                    }
                    if (data.error) {
                        throw new Error(data.error);
                    }
                } catch (e) {
                   if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                       console.error("Error parsing JSON line", e);
                   }
                }
            }
        }
        
        if (done) break;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500" />

        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Enter Website URL
              </h2>
              <p className="text-sm text-gray-500">
                Paste any URL and start chatting with its content
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white/90 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-200 text-sm"
                disabled={loading}
              />
            </div>

            {!loading && !success && (
                <button
                type="submit"
                disabled={!url.trim()}
                className="w-full py-3.5 px-6 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 flex items-center justify-center gap-2 text-sm"
                >
                🚀 Start Chatting
                </button>
            )}
            
            {loading && (
                 <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Processing...
                        </div>
                        <div className="space-y-2">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-start gap-2 text-xs text-gray-600 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <ArrowRight className="w-3 h-3 mt-0.5 text-indigo-400 shrink-0" />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Indexed {success.chunkCount} chunks from{" "}
              {success.documentCount} document(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
