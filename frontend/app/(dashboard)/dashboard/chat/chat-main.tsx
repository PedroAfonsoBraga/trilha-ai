"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Document {
  id: string;
  nome_original: string;
  tipo: string;
}

interface Props {
  accessToken: string;
  apiUrl: string;
  documents: Document[];
  sessionId?: string | null;
  initialMessages?: Message[];
  initialSelectedDocs?: string[];
}

function getDocIcon(tipo: string): string {
  if (tipo === "edital") return "📋";
  if (tipo === "tcc") return "🎓";
  return "📄";
}

export default function ChatMain({
  accessToken,
  apiUrl,
  documents,
  sessionId: initialSessionId,
  initialMessages = [],
  initialSelectedDocs = [],
}: Props) {
  const router = useRouter();
  const [selectedDocs, setSelectedDocs] = useState<string[]>(initialSelectedDocs);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggleDocument = (docId: string) => {
    if (streaming) return;
    setSelectedDocs((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, docId];
    });
  };

  const handleNewChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setSessionId(null);
    setStreamingContent("");
    setSelectedDocs([]);
    setError(null);
    router.push("/dashboard/chat");
  };

  const handleSend = useCallback(async (text: string) => {
    if (streaming || selectedDocs.length === 0) return;

    setError(null);

    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Falha na conexão" }));
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
      let newSessionId: string | null = null;

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
              newSessionId = parsed.session_id;
              setSessionId(newSessionId);
            } else if (parsed.type === "chunk" && parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
      }

      if (newSessionId && !initialSessionId) {
        router.replace(`/dashboard/chat?s=${newSessionId}`, { scroll: false });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Erro de conexão: ${err instanceof Error ? err.message : "desconhecido"}`,
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, selectedDocs, messages, sessionId, accessToken, apiUrl, initialSessionId]);

  const docNames = selectedDocs
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as Document[];

  return (
    <div className="flex h-full flex-col animate-fade-in-up">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Documentos ({selectedDocs.length}/3)
          </h2>
          <button
            onClick={handleNewChat}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Nova conversa
          </button>
        </div>
        {documents.length === 0 ? (
          <div className="mx-auto mt-2 max-w-3xl">
            <p className="text-xs text-slate-400">
              Nenhum documento ainda.{" "}
              <a href="/dashboard/concurso" className="text-teal-600 underline">
                Fazer upload
              </a>
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-2 flex max-w-3xl flex-wrap gap-1.5">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                disabled={streaming}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedDocs.includes(doc.id)
                    ? "border-teal-300 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"
                } ${streaming ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {selectedDocs.includes(doc.id) && (
                  <span className="text-teal-500">&#x2713;</span>
                )}
                {getDocIcon(doc.tipo)}{" "}
                {doc.nome_original.length > 24
                  ? doc.nome_original.slice(0, 24) + "..."
                  : doc.nome_original}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto mt-2 max-w-3xl px-4">
          <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>
        </div>
      )}

      <ChatMessages
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
        hasSelectedDocs={selectedDocs.length > 0}
      />

      <ChatInput
        onSend={handleSend}
        disabled={streaming || selectedDocs.length === 0}
        placeholder={
          selectedDocs.length === 0
            ? "Selecione documentos para começar..."
            : "Pergunte sobre seus documentos..."
        }
        hasSelectedDocs={selectedDocs.length > 0}
      />

      {docNames.length > 0 && messages.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-1.5">
          <p className="mx-auto max-w-3xl text-[11px] text-slate-400">
            Consultando: {docNames.map((d) => d.nome_original).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
