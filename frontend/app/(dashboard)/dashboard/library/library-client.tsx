"use client";

import { useState, useCallback, useRef } from "react";
import type { LibraryDocument, SearchResult } from "@/types/documents";

interface Props {
  accessToken: string;
  initialDocuments: LibraryDocument[];
  apiUrl: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

function tipoLabel(tipo: string): string {
  return tipo === "edital" ? "Edital" : "PDF";
}

function tipoBadgeClass(tipo: string): string {
  return tipo === "edital"
    ? "bg-blue-100 text-blue-700"
    : "bg-amber-100 text-amber-700";
}

export default function LibraryClient({ accessToken, initialDocuments, apiUrl }: Props) {
  const [documents, setDocuments] = useState<LibraryDocument[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({ tipo: "", tag: "" });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allTags = Array.from(
    new Set(documents.flatMap((d) => d.tags || []))
  ).sort();

  const filteredDocs = documents.filter((d) => {
    if (filters.tipo && d.tipo !== filters.tipo) return false;
    if (filters.tag && !(d.tags || []).includes(filters.tag)) return false;
    return true;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "nome_original") {
      return dir * a.nome_original.localeCompare(b.nome_original, "pt");
    }
    return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${apiUrl}/api/library/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ query: query.trim(), top_k: 10 }),
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowResults(true);
        }
      } catch {
        // fallback
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [accessToken, apiUrl]);

  const handleUpdateTags = async (docId: string, tags: string[]) => {
    try {
      await fetch(`${apiUrl}/api/library/${docId}/tags`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tags }),
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, tags } : d))
      );
    } catch {
      // fallback
    }
  };

  const handleAddTag = (docId: string) => {
    const tag = tagInput.trim();
    if (!tag) return;
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const currentTags = doc.tags || [];
    if (currentTags.includes(tag)) {
      setTagInput("");
      return;
    }
    handleUpdateTags(docId, [...currentTags, tag]);
    setTagInput("");
  };

  const handleRemoveTag = (docId: string, tag: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const currentTags = doc.tags || [];
    handleUpdateTags(docId, currentTags.filter((t) => t !== tag));
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/library/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar em todos os seus documentos..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            buscando...
          </span>
        )}

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto">
            {searchResults.map((r) => (
              <a
                key={r.chunk_id}
                href={`/dashboard/concurso/${r.document_id}`}
                className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tipoBadgeClass(r.tipo)}`}>
                    {tipoLabel(r.tipo)}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {r.nome_original}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(r.similarity * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{r.content}</p>
              </a>
            ))}
            <button
              onClick={() => { setShowResults(false); setSearchQuery(""); }}
              className="block w-full px-4 py-2 text-center text-xs text-slate-500 hover:text-slate-700"
            >
              Fechar
            </button>
          </div>
        )}
        {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-6 text-center text-sm text-slate-500">
            Nenhum resultado encontrado.
          </div>
        )}
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.tipo}
          onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          <option value="edital">Editais</option>
          <option value="pdf_generico">PDFs</option>
        </select>

        <select
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Todas as tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="created_at">Data de upload</option>
          <option value="nome_original">Nome</option>
        </select>

        <button
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          {sortOrder === "asc" ? "Crescente ↑" : "Decrescente ↓"}
        </button>

        <span className="text-xs text-slate-400 ml-auto">
          {sortedDocs.length} de {documents.length} documentos
        </span>
      </div>

      {/* Document cards grid */}
      {sortedDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center">
          <p className="text-slate-500">Nenhum documento encontrado com os filtros atuais.</p>
          <a
            href="/dashboard/concurso"
            className="mt-2 inline-block text-sm text-teal-600 hover:text-teal-700"
          >
            Fazer upload de um edital ou PDF →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tipoBadgeClass(doc.tipo)}`}>
                      {tipoLabel(doc.tipo)}
                    </span>
                    {doc.processado && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        Processado
                      </span>
                    )}
                  </div>
                  <a
                    href={`/dashboard/concurso/${doc.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-600 truncate block"
                  >
                    {doc.nome_original}
                  </a>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(doc.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title="Excluir documento"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {(doc.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(doc.id, tag)}
                      className="ml-0.5 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {editingTags === doc.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTag(doc.id);
                        if (e.key === "Escape") { setEditingTags(null); setTagInput(""); }
                      }}
                      placeholder="Nova tag..."
                      className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-teal-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddTag(doc.id)}
                      className="rounded bg-teal-500 px-1.5 py-0.5 text-xs text-white hover:bg-teal-600"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingTags(doc.id); setTagInput(""); }}
                    className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 hover:border-teal-400 hover:text-teal-500"
                  >
                    + tag
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
