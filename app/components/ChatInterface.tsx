"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Globe, RotateCcw } from "lucide-react";
import Sidebar from "./Sidebar";
import { Metrics } from "./MetricsDashboard";
import { Source } from "./SourcePanel";
import { Logo } from "./Logo";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  metrics?: Metrics;
  timestamp?: string;
}

interface ChatInterfaceProps {
  ingestedUrl: string;
  chunkCount: number;
  onReset?: () => void;
}

export default function ChatInterface({
  ingestedUrl,
  chunkCount,
  onReset,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const thresholdPx = 120;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
    setShouldAutoScroll((prev) => (prev === isNearBottom ? prev : isNearBottom));
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
    <div className="w-full h-full flex min-h-0 rounded-2xl overflow-hidden shadow-2xl border border-white/60 bg-white/30 backdrop-blur-xl">
      {/* Active Source / Reset */}
      <div className="w-72 border-r border-white/60 bg-white/40 backdrop-blur-xl hidden lg:flex flex-col">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" textSize="text-base" />
          </div>
        </div>

        <div className="px-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Active Sources
          </h3>
          <a
            href={ingestedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/70 border border-gray-100 hover:border-indigo-200 hover:bg-white transition-colors shadow-sm"
          >
            <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs text-gray-700 truncate">
              {ingestedUrl}
            </span>
          </a>
        </div>

        <div className="mt-auto p-6 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 hover:bg-white transition-colors text-sm font-medium text-gray-700 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-lg border-b border-white/60 px-6 py-4 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" textSize="text-lg" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white/70 hover:bg-white transition-colors text-xs font-medium text-gray-700 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-medium">
                  {chunkCount} chunks indexed
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
              prev === isNearBottom ? prev : isNearBottom
            );
          }}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6 shadow-inner">
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                How can I help you?
              </h3>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                I have processed your source(s) and I am ready to answer.
              </p>

              <div className="mt-6 w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  suggestions.length
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
                    className={`text-left px-4 py-3 rounded-xl bg-white/70 border border-gray-100 transition-colors shadow-sm text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed ${
                      suggestion
                        ? "hover:bg-white hover:border-indigo-200"
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
            <div key={i} className="space-y-2">
              <div
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-indigo-500/20"
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="animate-pulse">
                    Analyzing sources & generating answer...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white/70 backdrop-blur-lg border-t border-white/60">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full pl-5 pr-14 py-4 rounded-xl border border-gray-200 bg-white/80 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 shadow-sm text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 p-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-500/20"
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
    </div>
  );
}
