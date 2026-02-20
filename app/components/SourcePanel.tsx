"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react";

export interface Source {
  id: number;
  content: string;
  metadata: Record<string, string>;
  similarity: number;
}

interface SourcePanelProps {
  sources: Source[];
}

function SimilarityBadge({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-emerald-100 text-emerald-700"
      : value >= 50
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {value}% match
    </span>
  );
}

export default function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-700">
            Sources Used ({sources.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-lg border border-gray-100 bg-white/70 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedSource(
                    expandedSource === source.id ? null : source.id
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 w-6 h-6 rounded-md flex items-center justify-center">
                    {source.id}
                  </span>
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    Source {source.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SimilarityBadge value={source.similarity} />
                  {expandedSource === source.id ? (
                    <ChevronUp className="w-3 h-3 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSource === source.id && (
                <div className="px-3 pb-3 border-t border-gray-50">
                  <p className="text-xs text-gray-600 leading-relaxed mt-2 whitespace-pre-wrap">
                    {source.content}
                  </p>
                  {source.metadata?.source && (
                    <a
                      href={source.metadata.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
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
