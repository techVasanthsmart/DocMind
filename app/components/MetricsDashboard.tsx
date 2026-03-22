"use client";

import {
  Shield,
  Target,
  AlertTriangle,
  BookOpen,
  Search,
  Type,
  Combine,
} from "lucide-react";

export interface Metrics {
  faithfulness: number;
  contextRelevance: number;
  hallucinationRisk: number;
  sourceCoverage: number;
  avgSemanticScore?: number;
  avgLexicalScore?: number;
  avgHybridScore?: number;
}

interface MetricsDashboardProps {
  metrics: Metrics;
}

function getColor(value: number, invert = false): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 75) return "bg-success";
  if (effective >= 50) return "bg-warning";
  return "bg-error";
}

function getTrackColor(value: number, invert = false): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 75) return "text-success";
  if (effective >= 50) return "text-warning";
  return "text-error";
}

function MetricBar({
  value,
  label,
  icon: Icon,
  invert = false,
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  invert?: boolean;
}) {
  const displayValue = invert ? 100 - value : value;
  const colorClass = getColor(value, invert);
  const trackColorClass = getTrackColor(value, invert);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 ${trackColorClass} shrink-0`} />
          <span className="text-xs font-medium text-foreground dark:text-white truncate">
            {label}
          </span>
        </div>
        <span className={`text-xs font-semibold ${trackColorClass} shrink-0`}>
          {displayValue}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

export default function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const averageScore = Math.round(
    (metrics.faithfulness +
      metrics.contextRelevance +
      (100 - metrics.hallucinationRisk) +
      metrics.sourceCoverage) /
      4,
  );

  const avgColor = (() => {
    if (averageScore >= 75) return "text-success";
    if (averageScore >= 50) return "text-warning";
    return "text-error";
  })();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-700 p-4 shadow-card">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
        Quality Metrics
      </h4>

      {/* Overall Score */}
      <div
        className={`mb-4 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800 ${avgColor} text-center`}
      >
        <div className="text-2xl font-bold">{averageScore}%</div>
        <p className="text-xs text-muted">Overall Quality</p>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-3">
        <MetricBar
          value={metrics.faithfulness}
          label="Faithfulness"
          icon={Shield}
        />
        <MetricBar
          value={metrics.contextRelevance}
          label="Relevance"
          icon={Target}
        />
        <MetricBar
          value={metrics.hallucinationRisk}
          label="Hallucination-Free"
          icon={AlertTriangle}
          invert={true}
        />
        <MetricBar
          value={metrics.sourceCoverage}
          label="Source Coverage"
          icon={BookOpen}
        />
      </div>

      {/* Retrieval Quality - Hybrid Search Scores */}
      {metrics.avgHybridScore !== undefined && (
        <div className="mt-4 pt-4 border-t border-border dark:border-zinc-700">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Retrieval Quality
          </h4>
          <div className="space-y-3">
            <MetricBar
              value={metrics.avgSemanticScore ?? 0}
              label="Semantic"
              icon={Search}
            />
            <MetricBar
              value={metrics.avgLexicalScore ?? 0}
              label="Lexical (BM25)"
              icon={Type}
            />
            <MetricBar
              value={metrics.avgHybridScore}
              label="Hybrid Score"
              icon={Combine}
            />
          </div>
        </div>
      )}
    </div>
  );
}
