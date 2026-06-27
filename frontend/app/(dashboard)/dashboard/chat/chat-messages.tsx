"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "./chat-main";

interface Props {
  messages: Message[];
  streaming: boolean;
  streamingContent: string;
  hasSelectedDocs: boolean;
}

function highlightCode(code: string, _language: string | undefined) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-800 p-4 text-sm text-slate-100">
      <code>{code}</code>
    </pre>
  );
}

export default function ChatMessages({
  messages,
  streaming,
  streamingContent,
  hasSelectedDocs,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {showEmpty && (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <p className="text-sm text-slate-400">
              {hasSelectedDocs
                ? "Envie uma mensagem para começar"
                : "Selecione documentos acima para conversar"}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-a:text-teal-600 prose-code:rounded prose-code:bg-slate-700/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-pre:bg-transparent prose-pre:p-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeStr = String(children).replace(/\n$/, "");
                          if (match) {
                            return highlightCode(codeStr, match[1]);
                          }
                          return (
                            <code className="rounded bg-slate-700/10 px-1 py-0.5 text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre({ children }) {
                          return <>{children}</>;
                        },
                        table({ children }) {
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border-collapse text-sm">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({ children }) {
                          return (
                            <th className="border-b border-slate-300 px-3 py-2 text-left font-semibold">
                              {children}
                            </th>
                          );
                        },
                        td({ children }) {
                          return (
                            <td className="border-b border-slate-200 px-3 py-2">
                              {children}
                            </td>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeStr = String(children).replace(/\n$/, "");
                        if (match) {
                          return highlightCode(codeStr, match[1]);
                        }
                        return (
                          <code className="rounded bg-slate-700/10 px-1 py-0.5 text-sm" {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre({ children }) {
                        return <>{children}</>;
                      },
                    }}
                  >
                    {streamingContent}
                  </ReactMarkdown>
                </div>
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-teal-500" />
              </div>
            </div>
          )}

          {streaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
