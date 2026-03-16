"use client";

import { FileText, Book, Globe, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

export function FloatingDecorations() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    setIsMobile(window.innerWidth < 1024);
  }, []);

  // Hide floating decorations on mobile for performance
  if (isMobile) {
    return null;
  }

  const decorations = [
    {
      icon: FileText,
      label: "PDF",
      top: "15%",
      left: "5%",
      delay: "0s",
      duration: "4s",
    },
    {
      icon: Book,
      label: "DOCX",
      top: "25%",
      right: "8%",
      delay: "0.5s",
      duration: "4.5s",
    },
    {
      icon: Globe,
      label: "URL",
      top: "60%",
      left: "2%",
      delay: "1s",
      duration: "5s",
    },
    {
      icon: BarChart3,
      label: "PPT",
      bottom: "15%",
      right: "10%",
      delay: "1.5s",
      duration: "4.2s",
    },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {decorations.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="absolute text-primary/15"
            style={{
              top: item.top,
              bottom: item.bottom,
              left: item.left,
              right: item.right,
              animation: `float ${item.duration} ease-in-out infinite`,
              animationDelay: item.delay,
            }}
          >
            <Icon className="w-20 h-20" />
          </div>
        );
      })}
    </div>
  );
}
