"use client";

import { Shield, Target, AlertTriangle, BookOpen } from "lucide-react";

export interface Metrics {
  faithfulness: number;
  contextRelevance: number;
  hallucinationRisk: number;
  sourceCoverage: number;
}

interface MetricsDashboardProps {
  metrics: Metrics;
}

function getColor(value: number, invert = false): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 75) return "text-emerald-600";
  if (effective >= 50) return "text-amber-500";
  return "text-red-500";
}

function getBgColor(value: number, invert = false): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 75) return "bg-emerald-500";
  if (effective >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getTrackColor(value: number, invert = false): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 75) return "stroke-emerald-500";
  if (effective >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function CircularProgress({
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
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            className={`${getTrackColor(value, invert)} transition-all duration-1000 ease-out`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${getColor(value, invert)}`}>
            {value}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Icon className={`w-3.5 h-3.5 ${getColor(value, invert)}`} />
        <span className="text-xs font-medium text-gray-600 text-center">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl border border-gray-100 p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Evaluation Metrics
      </h4>
      <div className="flex items-center justify-around gap-2">
        <CircularProgress
          value={metrics.faithfulness}
          label="Faithfulness"
          icon={Shield}
        />
        <CircularProgress
          value={metrics.contextRelevance}
          label="Relevance"
          icon={Target}
        />
        <CircularProgress
          value={metrics.hallucinationRisk}
          label="Hallucination"
          icon={AlertTriangle}
          invert={true}
        />
        <CircularProgress
          value={metrics.sourceCoverage}
          label="Sources"
          icon={BookOpen}
        />
      </div>
    </div>
  );
}
