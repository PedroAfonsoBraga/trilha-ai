import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LibraryClient from "./library-client";
import type { LibraryDocument } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || "";

  let documents: LibraryDocument[] = [];
  let totalDocs = 0;
  try {
    const res = await fetch(`${API_URL}/api/library?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      documents = data.documents || [];
      totalDocs = data.total || 0;
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Biblioteca</h1>
            <p className="mt-1 text-slate-600">
              {totalDocs} documento{totalDocs !== 1 ? "s" : ""} na sua biblioteca
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Voltar ao Dashboard
          </a>
        </div>

        <LibraryClient
          accessToken={accessToken}
          initialDocuments={documents}
          apiUrl={API_URL}
        />
      </div>
    </div>
  );
}
