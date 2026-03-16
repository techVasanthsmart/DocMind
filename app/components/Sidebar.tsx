"use client";

import MetricsDashboard, { Metrics } from "./MetricsDashboard";
import SourcePanel, { Source } from "./SourcePanel";
import { Info } from "lucide-react";

interface SidebarProps {
  metrics?: Metrics;
  sources?: Source[];
}

export default function Sidebar({ metrics, sources }: SidebarProps) {
  if (!metrics && !sources) {
    return (
      <div className="w-80 border-l border-border bg-gray-50 p-6 hidden lg:flex flex-col items-center justify-center text-center space-y-4 dark:bg-zinc-900 dark:border-zinc-700">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center">
          <Info className="w-6 h-6 text-muted" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground dark:text-white">
            No Data Available
          </h3>
          <p className="text-xs text-muted mt-1 max-w-50">
            Ask a question to see evaluation metrics and source citations here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-gray-50 hidden lg:flex flex-col min-h-0 dark:bg-zinc-900 dark:border-zinc-700 p-4">
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-700 p-4 space-y-6 shadow-sm">
        {metrics && (
          <div className="animate-fade-in">
            <MetricsDashboard metrics={metrics} />
          </div>
        )}
        {metrics && sources && (
          <div className="border-t border-border dark:border-zinc-700 pt-6" />
        )}
        {sources && (
          <div className="animate-fade-in">
            <SourcePanel sources={sources} />
          </div>
        )}
      </div>
    </div>
  );
}
