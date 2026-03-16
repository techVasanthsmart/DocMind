"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Globe,
  File,
} from "lucide-react";

export interface Source {
  id: number;
  content: string;
  metadata: Record<string, string>;
  similarity: number;
  semanticScore?: number;
  lexicalScore?: number;
  hybridScore?: number;
}

interface SourcePanelProps {
  sources: Source[];
}

function SimilarityBadge({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-success/10 text-success"
      : value >= 50
        ? "bg-warning/10 text-warning"
        : "bg-error/10 text-error";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {value}% match
    </span>
  );
}

function ScoreBreakdown({
  semantic,
  lexical,
}: {
  semantic: number;
  lexical: number;
}) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
        Sem {semantic}%
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
        Lex {lexical}%
      </span>
    </div>
  );
}

function SourceTypeBadge({
  source,
  metadata,
}: {
  source: Source;
  metadata: Record<string, string>;
}) {
  // Determine source type from metadata
  const sourceType = metadata?.source?.includes("http") ? "url" : "file";
  const fileName = metadata?.fileName || "Uploaded file";

  if (sourceType === "file") {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent/10 text-accent dark:bg-accent/20">
        <File className="w-3 h-3" />
        <span
          className="text-xs font-medium truncate max-w-37.5"
          title={fileName}
        >
          {fileName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent/10 text-accent dark:bg-accent/20">
      <Globe className="w-3 h-3" />
      <span className="text-xs font-medium">URL</span>
    </div>
  );
}

export default function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-700 overflow-hidden shadow-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground dark:text-white">
            Sources Used ({sources.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-lg border border-border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedSource(
                    expandedSource === source.id ? null : source.id,
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-white bg-accent w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                    {source.id}
                  </span>
                  <SourceTypeBadge source={source} metadata={source.metadata} />
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <SimilarityBadge value={source.similarity} />
                  {expandedSource === source.id ? (
                    <ChevronUp className="w-3 h-3 text-muted" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted" />
                  )}
                </div>
              </button>

              {source.semanticScore !== undefined &&
                source.lexicalScore !== undefined && (
                  <div className="px-3 pb-1">
                    <ScoreBreakdown
                      semantic={source.semanticScore}
                      lexical={source.lexicalScore}
                    />
                  </div>
                )}

              {expandedSource === source.id && (
                <div className="px-3 pb-3 border-t border-border dark:border-zinc-700">
                  <p className="text-xs text-muted dark:text-zinc-400 leading-relaxed mt-2 whitespace-pre-wrap">
                    {source.content}
                  </p>
                  {source.metadata?.source && (
                    <a
                      href={source.metadata.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-600 transition-colors dark:hover:text-accent-400"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View original
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
