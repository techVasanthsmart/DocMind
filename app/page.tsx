"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { CombinedSourceInput } from "./components/CombinedSourceInput";
import { FeaturePillsSection } from "./components/FeaturePillsSection";
import ChatInterface from "./components/ChatInterface";

export default function Home() {
  const [ingested, setIngested] = useState<{
    sources: Array<{ type: "url" | "file"; name: string }>;
    chunkCount: number;
    documentCount: number;
  } | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Clear Pinecone session data when tab/browser is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // keepalive ensures the request completes even as the page unloads
      fetch("/api/session", { method: "DELETE", keepalive: true }).catch(
        () => {},
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    // Listen for dark mode changes
    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains("dark");
      setIsDark(isDarkNow);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    const newIsDark = !isDark;

    if (newIsDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(newIsDark);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <main
      className={`${ingested ? "h-svh overflow-y-auto bg-white" : "min-h-screen bg-white"} dark:bg-zinc-900 transition-colors`}
    >
      {/* Dark Mode Toggle - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleDarkMode}
          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors shadow-sm ${
            isDark
              ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              : "bg-white border-border hover:bg-gray-50"
          }`}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>
      <AnimatePresence mode="wait">
        {!ingested ? (
          <div className="relative px-4 sm:px-6 h-svh overflow-hidden flex flex-col">
            {/* Gradient Background Decoration */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl dark:bg-accent/10"></div>
              <div
                className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl dark:bg-blue-500/10"
                style={{ animation: "float 8s ease-in-out infinite" }}
              ></div>
            </div>

            {/* Hero Content */}
            <motion.div
              className="flex flex-col items-center justify-center flex-1 space-y-4 sm:space-y-5 max-w-3xl mx-auto relative px-2 sm:px-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
            >
              {/* Badge */}
              <motion.div
                className="px-3 py-1 rounded-full border border-accent/30 bg-accent/5 backdrop-blur-sm"
                variants={itemVariants}
              >
                <p className="text-xs font-medium text-accent">
                  ✨ AI-Powered Research
                </p>
              </motion.div>

              {/* Hero Title with Gradient */}
              <motion.div
                className="text-center space-y-2"
                variants={itemVariants}
              >
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter bg-linear-to-r from-foreground via-accent to-blue-500 dark:from-white dark:via-accent dark:to-blue-400 bg-clip-text text-transparent">
                  DocMind
                </h1>
                <p className="text-xl sm:text-2xl font-semibold text-foreground dark:text-white">
                  Chat with Files & Links
                </p>
                <div className="h-0.5 w-20 bg-linear-to-r from-accent to-blue-500 mx-auto rounded-full"></div>
              </motion.div>

              {/* Subheading */}
              <motion.p
                className="text-sm sm:text-base text-muted dark:text-zinc-300 max-w-xl text-center leading-relaxed"
                variants={itemVariants}
              >
                Upload files and websites. Get instant answers with sources
                shown.
              </motion.p>

              {/* Input Card with Glow */}
              <motion.div
                className="w-full max-w-xl relative"
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute inset-0 bg-linear-to-r from-accent/20 to-blue-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <CombinedSourceInput onIngested={setIngested} />
                </div>
              </motion.div>

              {/* Features Grid */}
              <motion.div variants={itemVariants}>
                <FeaturePillsSection />
              </motion.div>

              {/* Stats Section - Compact */}
              <motion.div
                className="hidden sm:grid grid-cols-3 gap-3 w-full max-w-md"
                variants={itemVariants}
              >
                <div className="text-center p-2 rounded-lg border border-border/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:border-accent/50 transition-colors">
                  <p className="text-lg font-bold text-accent">10M+</p>
                  <p className="text-xs text-muted dark:text-zinc-400">
                    Processed
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg border border-border/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:border-accent/50 transition-colors">
                  <p className="text-lg font-bold text-accent">99.9%</p>
                  <p className="text-xs text-muted dark:text-zinc-400">
                    Accuracy
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg border border-border/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:border-accent/50 transition-colors">
                  <p className="text-lg font-bold text-accent">24/7</p>
                  <p className="text-xs text-muted dark:text-zinc-400">
                    Available
                  </p>
                </div>
              </motion.div>

              {/* Supported Formats */}
              <motion.p
                className="text-xs sm:text-sm text-muted dark:text-zinc-400 text-center"
                variants={itemVariants}
              >
                📄 PDF • 📊 Excel • 📝 Docs • 🌐 URLs • 📑 Markdown
              </motion.p>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="h-full min-h-0 max-w-none mx-auto"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ChatInterface
              sources={ingested.sources}
              chunkCount={ingested.chunkCount}
              onReset={() => setIngested(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
