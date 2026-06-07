"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OnboardingForm() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!perfil) {
      setError("Selecione seu perfil de estudos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ perfil, nome: nome || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Erro ao salvar perfil");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão");
      setLoading(false);
    }
  }

  const perfis = [
    {
      value: "concurseiro",
      label: "Concurseiro(a)",
      description: "Estou estudando para concursos públicos",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      value: "universitario",
      label: "Universitário(a)",
      description: "Estou na faculdade e preciso organizar os estudos",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
    },
    {
      value: "mestrando",
      label: "Mestrando(a)",
      description: "Estou fazendo mestrado/doutorado e pesquisando",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-teal-600">Trilha</h1>
          <p className="mt-2 text-xl font-semibold text-slate-900">Bem-vindo(a)!</p>
          <p className="mt-1 text-slate-600">
            Para personalizar sua experiência, conte-nos sobre seus estudos
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1">
              Como podemos te chamar?
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome (opcional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Qual é o seu perfil de estudos?</p>
            <div className="grid gap-3">
              {perfis.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPerfil(p.value)}
                  className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                    perfil === p.value
                      ? "border-teal-600 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={perfil === p.value ? "text-teal-600" : "text-slate-400"}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{p.label}</p>
                    <p className="text-sm text-slate-500">{p.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !perfil}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : "Começar a estudar"}
          </button>
        </div>
      </div>
    </div>
  );
}
