"use client";

import { useState, useCallback, useMemo } from "react";
import { Flashcard } from "@/types/documents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ReviewSessionStats {
  total: number;
  completed: number;
  facies: number;
  dificeis: number;
  erros: number;
}

interface FlashcardReviewClientProps {
  cards: Flashcard[];
  accessToken: string;
}

export default function FlashcardReviewClient({
  cards,
  accessToken,
}: FlashcardReviewClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [sessionStats, setSessionStats] = useState<ReviewSessionStats>({
    total: cards.length,
    completed: 0,
    facies: 0,
    dificeis: 0,
    erros: 0,
  });
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtra cards já completados nesta sessão
  const activeCards = useMemo(
    () => cards.filter((c) => !completed.has(c.id)),
    [cards, completed],
  );

  const currentCard = activeCards[currentIndex] ?? null;

  // --- Submete revisão ---
  const submitReview = useCallback(
    async (quality: 1 | 3 | 5) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_URL}/api/flashcards/${currentCard.id}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ quality }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Erro ao registrar revisão");
        }

        // Atualiza estatísticas
        setSessionStats((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          facies: prev.facies + (quality === 5 ? 1 : 0),
          dificeis: prev.dificeis + (quality === 3 ? 1 : 0),
          erros: prev.erros + (quality === 1 ? 1 : 0),
        }));

        // Marca como completo
        const newCompleted = new Set(completed);
        newCompleted.add(currentCard.id);
        setCompleted(newCompleted);

        // Avança ou finaliza
        // NOTA: activeCards será recalculado via useMemo removendo o card atual.
        // Mantemos currentIndex no mesmo valor — o próximo card já está na posição.
        const remaining = cards.filter((c) => !newCompleted.has(c.id));
        if (remaining.length > 0) {
          setShowAnswer(false);
        } else {
          setFinished(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro inesperado ao revisar",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, submitting, currentIndex, activeCards.length, cards, completed, accessToken],
  );

  // --- Tela de resumo da sessão ---
  if (finished) {
    const acertos = sessionStats.facies + sessionStats.dificeis;
    const precisao =
      sessionStats.completed > 0
        ? Math.round((acertos / sessionStats.completed) * 100)
        : 0;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Sessão concluída!
        </h2>
        <p className="text-slate-500 mb-8">
          Você revisou {sessionStats.completed} de {sessionStats.total}{" "}
          flashcard(s).
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-2xl font-bold text-green-700">
              {sessionStats.facies}
            </p>
            <p className="text-sm text-green-600">Fácil (5)</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-2xl font-bold text-amber-700">
              {sessionStats.dificeis}
            </p>
            <p className="text-sm text-amber-600">Difícil (3)</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-2xl font-bold text-red-700">
              {sessionStats.erros}
            </p>
            <p className="text-sm text-red-600">Errei (1)</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-700">{precisao}%</p>
            <p className="text-sm text-slate-500">Precisão</p>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <a
            href="/dashboard/flashcards"
            className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Próxima revisão
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  // --- Nenhum card disponível (todos completados) ---
  if (!currentCard) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Todos os cards revisados!
        </h2>
        <a
          href="/dashboard"
          className="inline-block mt-6 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Voltar ao Dashboard
        </a>
      </div>
    );
  }

  // --- Sessão de revisão ativa ---
  const progressPercent = Math.round(
    (sessionStats.completed / (sessionStats.total || 1)) * 100,
  );

  return (
    <div>
      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-1.5">
          <span>
            {sessionStats.completed} de {sessionStats.total} revisados
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-xl border border-slate-200 bg-white p-8 min-h-[280px] flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {!showAnswer ? (
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Frente
            </p>
            <p className="text-xl font-semibold text-slate-900 leading-relaxed">
              {currentCard.frente}
            </p>
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                {currentCard.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-6 text-sm text-slate-400">
              Clique para ver a resposta
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Verso
            </p>
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
              {currentCard.verso}
            </p>
          </div>
        )}
      </div>

      {/* Botões de avaliação (só aparecem após mostrar resposta) */}
      {showAnswer && (
        <div className="mt-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => submitReview(1)}
              disabled={submitting}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Errei"}
            </button>
            <button
              onClick={() => submitReview(3)}
              disabled={submitting}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Difícil"}
            </button>
            <button
              onClick={() => submitReview(5)}
              disabled={submitting}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {submitting ? "..." : "Fácil"}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Como foi sua resposta?
          </p>
        </div>
      )}
    </div>
  );
}
