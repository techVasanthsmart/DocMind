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
    <div className="w-80 border-l border-white/60 bg-white/40 backdrop-blur-xl p-4 overflow-y-auto hidden lg:block space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      <div className="space-y-4">
        {metrics && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MetricsDashboard metrics={metrics} />
          </div>
        )}
        {sources && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <SourcePanel sources={sources} />
          </div>
        )}
      </div>
    </div>
  );
}
