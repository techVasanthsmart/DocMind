"use client";

import { Shield, BarChart3, Link2 } from "lucide-react";

export function FeaturePillsSection() {
  const features = [
    {
      icon: Shield,
      label: "Anti-Hallucination",
    },
    {
      icon: BarChart3,
      label: "Evaluation Metrics",
    },
    {
      icon: Link2,
      label: "Source Citations",
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
      {features.map((feature, idx) => {
        const Icon = feature.icon;
        return (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm font-medium text-foreground dark:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Icon className="w-4 h-4 text-accent shrink-0" />
            <span className="whitespace-nowrap">{feature.label}</span>
          </div>
        );
      })}
    </div>
  );
}
