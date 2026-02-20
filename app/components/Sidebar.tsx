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
      <div className="w-80 border-l border-white/60 bg-white/40 backdrop-blur-xl p-6 hidden lg:flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Info className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            No Data Available
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
            Ask a question to see evaluation metrics and source citations here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-white/60 bg-white/40 backdrop-blur-xl hidden lg:flex flex-col min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      {metrics && (
        <div className="p-4 pb-3 bg-white/80 backdrop-blur-xl border-b border-white/20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MetricsDashboard metrics={metrics} />
          </div>
        </div>
      )}
      {sources && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <SourcePanel sources={sources} />
          </div>
        </div>
      )}
    </div>
  );
}
