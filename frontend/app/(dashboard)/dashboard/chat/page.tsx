import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatClient from "./chat-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  let documents: Array<{ id: string; nome_original: string; tipo: string }> = [];
  try {
    const res = await fetch(`${API_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      documents = await res.json();
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Concurso Assistant — Chat
          </h1>
          <a
            href="/dashboard"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Voltar ao Dashboard
          </a>
        </div>
        <div className="mt-8">
          <ChatClient
            accessToken={accessToken}
            documents={documents}
            apiUrl={API_URL}
          />
        </div>
      </div>
    </div>
  );
}
