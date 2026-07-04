import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ChatSession } from "@/types/documents";
import ChatMain from "./chat-main";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Document {
  id: string;
  nome_original: string;
  tipo: string;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { s?: string; doc_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  const sessionId = searchParams.s || null;

  let documents: Document[] = [];
  let initialMessages: Message[] = [];
  let initialSelectedDocs: string[] = [];

  try {
    const docsRes = await fetch(`${API_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (docsRes.ok) documents = await docsRes.json();
  } catch {
    // fallback
  }

  const docIdFromParams = searchParams.doc_id || null;

  if (sessionId) {
    try {
      const [msgsRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/chat/sessions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }),
      ]);

      if (msgsRes.ok) {
        const data = await msgsRes.json();
        if (Array.isArray(data)) {
          initialMessages = data.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        }
      }

      if (sessionsRes.ok) {
        const sessions: ChatSession[] = await sessionsRes.json();
        const current = sessions.find((s) => s.id === sessionId);
        if (current?.document_ids) {
          initialSelectedDocs = current.document_ids;
        }
      }
    } catch {
      // fallback
    }
  } else if (docIdFromParams) {
    initialSelectedDocs = [docIdFromParams];
  }

  return (
    <ChatMain
      key={sessionId || "new"}
      accessToken={accessToken}
      apiUrl={API_URL}
      documents={documents}
      sessionId={sessionId}
      initialMessages={initialMessages}
      initialSelectedDocs={initialSelectedDocs}
    />
  );
}
