"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

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
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          const lines = parts.filter((line) => line.trim() !== "");

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.step) {
                setSteps((prev) => [...prev, data.step]);
              }
              if (data.success) {
                setSuccess({
                  chunkCount: data.chunkCount,
                  documentCount: data.documentCount,
                });
                toast.success(
                  `✓ Processed ${data.chunkCount} chunks from ${data.documentCount} document(s)`,
                );
                onIngested({
                  url: url.trim(),
                  chunkCount: data.chunkCount,
                  documentCount: data.documentCount,
                });
                setLoading(false);
                return; // Done
              }
              if (data.error) {
                setError(data.error);
                toast.error(`✗ ${data.error}`);
                setLoading(false);
                await reader.cancel();
                return;
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message !== "Unexpected end of JSON input"
              ) {
                console.error("Error parsing JSON line", e);
              }
            }
          }
        }

        if (done) break;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Something went wrong";
      setError(errorMsg);
      toast.error(`✗ ${errorMsg}`);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <Globe className="w-5 h-5" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-white text-foreground placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-150 text-base dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-400"
            disabled={loading}
          />
        </div>

        {!loading && !success && (
          <button
            type="submit"
            disabled={!url.trim()}
            className="w-full py-3 px-6 rounded-lg font-medium text-white bg-accent hover:bg-accent-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 text-base"
          >
            <span>Start Chatting</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3 dark:bg-accent/10">
              <div className="flex items-center gap-2 text-sm font-medium text-accent">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs text-muted animate-fade-in"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/40 mt-1.5 shrink-0" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-error bg-error/5 rounded-lg px-4 py-3 text-sm border border-error/20 dark:bg-error/10">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 text-success bg-success/5 rounded-lg px-4 py-3 text-sm border border-success/20 dark:bg-success/10">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Indexed {success.chunkCount} chunks from {success.documentCount}{" "}
          document(s)
        </div>
      )}
    </div>
  );
}
