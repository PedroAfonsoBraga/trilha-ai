"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DeleteAccountButtonProps {
  accessToken: string;
  userEmail: string;
}

export default function DeleteAccountButton({
  accessToken,
  userEmail,
}: DeleteAccountButtonProps) {
  const router = useRouter();
  const [step, setStep] = useState<"initial" | "confirm" | "loading" | "done">("initial");
  const [typedEmail, setTypedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStartDelete = () => {
    setStep("confirm");
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (typedEmail !== userEmail) {
      setError("O email digitado não corresponde ao seu email de login.");
      return;
    }

    setStep("loading");
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/user/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setStep("done");
        // Redireciona após 3 segundos
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.detail || "Erro ao excluir conta. Tente novamente.");
        setStep("confirm");
      }
    } catch {
      setError("Falha de conexão com o servidor.");
      setStep("confirm");
    }
  };

  const handleCancel = () => {
    setStep("initial");
    setTypedEmail("");
    setError(null);
  };

  if (step === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-4xl">🗑️</p>
        <p className="mt-3 text-sm font-medium text-emerald-700">
          Conta excluída com sucesso!
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Todos os seus dados foram removidos. Redirecionando...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
            Excluir conta
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Esta ação é irreversível. Todos os seus documentos, flashcards, progresso e dados
            serão removidos permanentemente.
          </p>

          {step === "initial" && (
            <button
              onClick={handleStartDelete}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Excluir minha conta
            </button>
          )}

          {step === "confirm" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Digite <strong>{userEmail}</strong> para confirmar:
              </p>
              <input
                type="email"
                value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)}
                placeholder={userEmail}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDelete}
                  disabled={typedEmail !== userEmail}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmar exclusão
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              Excluindo seus dados...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
