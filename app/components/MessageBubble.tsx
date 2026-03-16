"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-expect-error - react-syntax-highlighter does not have type definitions
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-expect-error - react-syntax-highlighter does not have type definitions
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
import copy from "copy-to-clipboard";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-none px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-accent text-white">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 mt-0.5 shadow-md dark:bg-gray-800">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  // Assistant message with markdown rendering
  return (
    <div className="space-y-2">
      <div className="flex gap-3 justify-start">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5 shadow-md">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-none px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-white border border-border text-foreground dark:bg-zinc-900 dark:border-zinc-700 dark:text-white">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: (props: any) => {
                  const { node, inline, className, children, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "text";

                  if (inline) {
                    return (
                      <code className="bg-gray-100 dark:bg-zinc-800 rounded px-1.5 py-0.5 font-mono text-xs">
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden my-3">
                      <button
                        onClick={() => {
                          copy(String(children[0]));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        className="bg-gray-900! my-0!"
                        showLineNumbers
                      >
                        {String(children[0]).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-600 underline"
                  >
                    {children}
                  </a>
                ),
                p: ({ children }) => <p className="my-2">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside my-2 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside my-2 space-y-1">
                    {children}
                  </ol>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-semibold mt-4 mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mt-3 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-1">
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-accent/30 pl-4 my-2 italic text-muted">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <table className="border-collapse border border-border my-2 text-xs">
                    {children}
                  </table>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-2 py-1 bg-gray-100 dark:bg-zinc-800">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-2 py-1">{children}</td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded ml-11"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}
