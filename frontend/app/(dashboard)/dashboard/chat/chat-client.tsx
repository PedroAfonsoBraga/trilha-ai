"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Document {
  id: string;
  nome_original: string;
  tipo: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  accessToken: string;
  documents: Document[];
  apiUrl: string;
}

export default function ChatClient({ accessToken, documents, apiUrl }: Props) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, docId];
    });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || selectedDocs.length === 0) return;

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    try {
      const payload: Record<string, unknown> = {
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        document_ids: selectedDocs,
      };
      if (sessionId) {
        payload.session_id = sessionId;
      }

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erro: ${err.detail || "Falha na conexão"}` },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "session" && parsed.session_id) {
              setSessionId(parsed.session_id);
            } else if (parsed.type === "chunk" && parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {
            // ignore malformed SSE data
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erro de conexão: ${err instanceof Error ? err.message : "desconhecido"}` },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }, [input, streaming, selectedDocs, messages, sessionId, accessToken, apiUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setStreamingContent("");
  };

  const docNames = selectedDocs
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as Document[];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Selecione os documentos ({selectedDocs.length}/3)
          </h2>
          <button
            onClick={handleNewChat}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Nova conversa
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Você ainda não fez upload de documentos.{" "}
            <a href="/dashboard/concurso" className="text-teal-600 underline">
              Fazer upload
            </a>
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                disabled={streaming}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedDocs.includes(doc.id)
                    ? "border-teal-300 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                } ${streaming ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {selectedDocs.includes(doc.id) ? (
                  <span className="text-teal-500">&#x2713;</span>
                ) : null}
                {doc.tipo === "edital" ? "📋" : "📄"}{" "}
                {doc.nome_original.length > 28
                  ? doc.nome_original.slice(0, 28) + "..."
                  : doc.nome_original}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-[500px] flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && !streaming && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {selectedDocs.length === 0
                  ? "Selecione documentos acima para começar"
                  : "Envie uma mensagem para começar a conversa"}
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {streaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                    <div className="whitespace-pre-wrap">
                      {streamingContent}
                      <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-teal-500" />
                    </div>
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

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  selectedDocs.length === 0
                    ? "Selecione documentos primeiro..."
                    : "Pergunte sobre seus documentos..."
                }
                disabled={streaming || selectedDocs.length === 0}
                className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming || selectedDocs.length === 0}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Enviar
              </button>
            </div>

            {docNames.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Usando: {docNames.map((d) => d.nome_original).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
