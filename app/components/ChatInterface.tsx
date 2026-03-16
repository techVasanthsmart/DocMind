"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Globe,
  RotateCcw,
  FileText,
  Plus,
  X,
  Sun,
  Moon,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { Metrics } from "./MetricsDashboard";
import { Source } from "./SourcePanel";
import { Logo } from "./Logo";
import { CombinedSourceInput } from "./CombinedSourceInput";
import { MessageBubble } from "./MessageBubble";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  metrics?: Metrics;
  timestamp?: string;
}

interface ChatInterfaceProps {
  sources: Array<{ type: "url" | "file"; name: string }>;
  chunkCount: number;
  onReset?: () => void;
}

export default function ChatInterface({
  sources: initialSources,
  chunkCount: initialChunkCount,
  onReset,
}: ChatInterfaceProps) {
  const [activeSources, setActiveSources] = useState(initialSources);
  const [totalChunks, setTotalChunks] = useState(initialChunkCount);
  const [showAddSource, setShowAddSource] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const ingestedUrl = activeSources.map((s) => s.name).join(", ");

  useEffect(() => {
    // Check for dark mode on client side
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

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

  const handleSourceAdded = (data: {
    sources: Array<{ type: "url" | "file"; name: string }>;
    chunkCount: number;
    documentCount: number;
  }) => {
    setActiveSources((prev) => [...prev, ...data.sources]);
    setTotalChunks((prev) => prev + data.chunkCount);
    setShowAddSource(false);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const thresholdPx = 120;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
    setShouldAutoScroll((prev) =>
      prev === isNearBottom ? prev : isNearBottom,
    );
  }, []);

  useEffect(() => {
    if (!shouldAutoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, shouldAutoScroll]);

  const sendQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMessage: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        metrics: data.metrics,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    await sendQuestion(question);
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setLoading(false);
    onReset?.();
  };

  // Get the latest assistant message with metrics
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.metrics);

  const fallbackSuggestionChips = [
    "What is this website about?",
    "What are the main topics covered?",
    "Summarize the key takeaways.",
    "What should I do next on this site?",
  ];

  useEffect(() => {
    if (messages.length !== 0) return;
    let cancelled = false;

    (async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch("/api/suggestions");
        const data = (await res.json()) as { suggestions?: unknown };
        if (cancelled) return;

        if (Array.isArray(data.suggestions)) {
          const clean = data.suggestions
            .filter((s): s is string => typeof s === "string")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 4);
          setSuggestions(clean);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ingestedUrl, messages.length]);

  return (
    <div className="w-full h-full flex min-h-0 rounded-2xl overflow-hidden shadow-lg border border-border bg-white dark:bg-zinc-900 dark:border-zinc-700">
      {/* Left Sidebar - Active Sources */}
      <div className="w-72 border-r border-border bg-gray-50 hidden lg:flex flex-col dark:bg-zinc-900 dark:border-zinc-700">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" textSize="text-base" />
          </div>
        </div>

        <div className="px-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Active Sources
          </h3>
          <div className="space-y-2">
            {activeSources.map((src, idx) =>
              src.type === "url" ? (
                <a
                  key={idx}
                  href={src.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-border hover:border-accent hover:bg-accent/5 transition-colors shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-accent/10"
                >
                  <Globe className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs text-foreground truncate dark:text-white">
                    {src.name}
                  </span>
                </a>
              ) : (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-border shadow-xs dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs text-foreground truncate dark:text-white">
                    {src.name}
                  </span>
                </div>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAddSource(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60 transition-colors text-xs font-medium text-accent dark:bg-accent/10 dark:hover:bg-accent/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>

        <div className="mt-auto p-6 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-foreground shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-border px-6 py-4 shadow-xs z-10 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" textSize="text-lg" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shadow-xs ${
                  isDark
                    ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    : "bg-white border-border hover:bg-gray-50"
                }`}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 transition-colors text-xs font-medium text-foreground shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <div className="flex items-center gap-2 bg-success/10 px-3 py-1 rounded-full border border-success/20 dark:bg-success/5">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success font-medium">
                  {totalChunks} chunks indexed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            const thresholdPx = 120;
            const isNearBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
            setShouldAutoScroll((prev) =>
              prev === isNearBottom ? prev : isNearBottom,
            );
          }}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 dark:text-white">
                How can I help you?
              </h3>
              <p className="text-sm text-muted max-w-sm leading-relaxed">
                I have processed your source(s) and I am ready to answer any
                questions.
              </p>

              <div className="mt-6 w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(suggestions.length
                  ? suggestions
                  : suggestionsLoading
                    ? ["", "", "", ""]
                    : fallbackSuggestionChips
                ).map((suggestion, idx) => (
                  <button
                    key={suggestion || idx}
                    type="button"
                    onClick={() => void sendQuestion(suggestion)}
                    disabled={loading || !suggestion}
                    className={`text-left px-4 py-3 rounded-lg bg-white border border-border transition-colors text-sm text-foreground disabled:opacity-60 disabled:cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-700 dark:text-white ${
                      suggestion
                        ? "hover:bg-accent/5 hover:border-accent/40"
                        : "animate-pulse"
                    }`}
                  >
                    {suggestion || "Loading suggestion..."}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-bl-none px-5 py-4 shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
                <div className="flex items-center gap-3 text-sm text-muted dark:text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span>Analyzing sources & generating answer...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-border dark:bg-zinc-900 dark:border-zinc-700">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full pl-5 pr-14 py-4 rounded-lg border border-border bg-white text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-150 shadow-sm text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 p-2 rounded-lg bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-600 transition-all duration-150 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        metrics={lastAssistantMessage?.metrics}
        sources={lastAssistantMessage?.sources}
      />

      {/* Add Source Modal */}
      {showAddSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground dark:text-white">
                Add Another Source
              </h2>
              <button
                type="button"
                onClick={() => setShowAddSource(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-muted dark:hover:bg-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CombinedSourceInput onIngested={handleSourceAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
