"use client";

import { useState } from "react";
import {
  Globe,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import URLInput from "./URLInput";
import { FileUploadPanel } from "./FileUploadPanel";

interface CombinedSourceInputProps {
  onIngested: (data: {
    sources: Array<{ type: "url" | "file"; name: string }>;
    chunkCount: number;
    documentCount: number;
  }) => void;
}

export function CombinedSourceInput({ onIngested }: CombinedSourceInputProps) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSteps, setUploadSteps] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<{
    chunkCount: number;
    documentCount: number;
  } | null>(null);

  const handleURLIngested = (data: {
    url: string;
    chunkCount: number;
    documentCount: number;
  }) => {
    onIngested({
      sources: [{ type: "url", name: data.url }],
      chunkCount: data.chunkCount,
      documentCount: data.documentCount,
    });
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setUploadError("");
    setUploadSuccess(null);
    setUploadSteps([]);
    submitFiles(selectedFiles);
  };

  const submitFiles = async (filesToSubmit: File[]) => {
    if (filesToSubmit.length === 0) return;

    setIsUploading(true);
    setUploadError("");
    setUploadSteps([]);

    const formData = new FormData();
    filesToSubmit.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

      let response: Response;
      try {
        response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errorMessage = "Failed to ingest files";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
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
                setUploadSteps((prev) => [...prev, data.step]);
              }
              if (data.success) {
                setUploadSuccess({
                  chunkCount: data.chunkCount,
                  documentCount: data.documentCount,
                });
                setIsUploading(false);
                onIngested({
                  sources: (data.sources || []).map(
                    (s: { type: string; name: string }) => ({
                      type: s.type as "url" | "file",
                      name: s.name,
                    }),
                  ),
                  chunkCount: data.chunkCount,
                  documentCount: data.documentCount,
                });
                return;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message !== "Unexpected end of JSON input"
              ) {
                throw e;
              }
            }
          }
        }

        if (done) break;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Something went wrong";
      setUploadError(msg);
      setFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Clean Segmented Control */}
      <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-border w-full sm:w-auto dark:bg-zinc-800 dark:border-zinc-700">
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 flex-1 sm:flex-initial ${
            mode === "url"
              ? "bg-white text-accent shadow-xs dark:bg-zinc-900 dark:text-accent"
              : "text-foreground hover:text-accent dark:text-zinc-300 dark:hover:text-accent"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">Paste URL</span>
          <span className="sm:hidden">URL</span>
        </button>

        <button
          onClick={() => setMode("file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 flex-1 sm:flex-initial ${
            mode === "file"
              ? "bg-white text-accent shadow-xs dark:bg-zinc-900 dark:text-accent"
              : "text-foreground hover:text-accent dark:text-zinc-300 dark:hover:text-accent"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Files</span>
          <span className="sm:hidden">Files</span>
        </button>
      </div>

      {/* Clean Content Card */}
      <div className="p-6 rounded-xl border border-border bg-white shadow-card dark:bg-zinc-900 dark:border-zinc-700">
        {mode === "url" && <URLInput onIngested={handleURLIngested} />}
        {mode === "file" && (
          <>
            <FileUploadPanel
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />

            {isUploading && (
              <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3 dark:bg-accent/10">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing files...
                </div>
                {uploadSteps.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-muted animate-fade-in"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-accent/40 mt-1.5 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <div className="mt-4 flex items-center gap-2 text-error bg-error/5 rounded-lg px-4 py-3 text-sm border border-error/20 dark:bg-error/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-4 flex items-center gap-2 text-success bg-success/5 rounded-lg px-4 py-3 text-sm border border-success/20 dark:bg-success/10">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Indexed {uploadSuccess.chunkCount} chunks from{" "}
                {uploadSuccess.documentCount} document(s)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
