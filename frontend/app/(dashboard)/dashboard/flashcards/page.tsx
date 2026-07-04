import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DueFlashcardsResponse } from "@/types/documents";
import FlashcardReviewClient from "./flashcard-review-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function FlashcardsReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let dueData: DueFlashcardsResponse | null = null;
  let fetchError = false;

  if (session) {
    try {
      const res = await fetch(`${API_URL}/api/flashcards/due`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        dueData = await res.json();
      } else {
        fetchError = true;
      }
    } catch {
      fetchError = true;
    }
  }

  const cards = dueData?.cards ?? [];
  const total = dueData?.total ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Revisão Espaçada
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Revise seus flashcards com o método SM-2 e fixe o conteúdo na memória
          de longo prazo.
        </p>

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700 font-medium">
              Erro ao carregar flashcards pendentes.
            </p>
            <p className="text-red-500 text-sm mt-1">
              Tente novamente mais tarde.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Nada para revisar hoje!
            </h2>
            <p className="text-slate-500">
              Você está em dia com suas revisões. Volte amanhã ou gere novos
              flashcards a partir dos seus documentos.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href="/dashboard/library"
                className="inline-block rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
              >
                Escolher documento na biblioteca
              </a>
              <a
                href="/dashboard/concurso"
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                Ou fazer upload de um novo documento →
              </a>
            </div>
          </div>
        ) : (
          <FlashcardReviewClient
            cards={cards}
            accessToken={session!.access_token}
          />
        )}
      </div>
    </div>
  );
}
