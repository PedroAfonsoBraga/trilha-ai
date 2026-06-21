export interface Document {
  id: string;
  user_id: string;
  tipo: "edital" | "pdf_generico";
  nome_original: string;
  storage_path: string;
  texto_extraido: string | null;
  metadata: DocumentMetadata;
  processado: boolean;
  created_at: string;
}

export interface DocumentMetadata {
  nome_original?: string;
  tamanho_bytes?: number;
  parsed?: ParsedEdital;
  cronograma?: CronogramaItem[];
  fichamento?: FichamentoData;
}

export interface ParsedEdital {
  banca: string;
  cargo?: string;
  orgao?: string;
  datas_importantes?: DataItem[];
  disciplinas?: Disciplina[];
  salario_inicial?: string;
  total_vagas?: number;
  resumo?: string;
  datas_raw?: string[];
}

export interface DataItem {
  evento: string;
  data: string;
  contexto?: string;
}

export interface Disciplina {
  nome: string;
  peso: number;
  num_questoes?: number | null;
}

export interface CronogramaItem {
  semana: number;
  periodo: string;
  disciplina: string;
  horas: number;
  peso: number;
  num_questoes?: number;
  completed?: boolean;
  modo?: string;
  ajustado?: boolean;
}

export interface ProgressItem {
  id: string;
  user_id: string;
  document_id: string;
  semana: number;
  disciplina: string;
  horas_estudadas: number;
  completed: boolean;
  nota?: string;
  completed_at?: string;
}

export interface ProgressSummary {
  total_items: number;
  completed_items: number;
  completion_rate: number;
  total_horas: number;
  by_disciplina: Record<string, number>;
}

export interface NotificationPreferences {
  user_id: string;
  prazo_prova: boolean;
  lembrete_estudo: boolean;
  resumo_semanal: boolean;
}

export interface FichamentoData {
  referencia: string;
  tema: string;
  objetivo: string;
  metodologia: string;
  principais_pontos: string[];
  citacoes_relevantes: string[];
  conclusao: string;
  comentarios: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string;
  frente: string;
  verso: string;
  tags: string[];
  easiness_factor: number;
  repetitions: number;
  interval_days: number;
  next_review: string;
  created_at: string;
}

export interface ShareLink {
  url: string;
  expires_at: string;
  existing: boolean;
}

export interface SharedContent {
  export_type: "cronograma" | "fichamento" | "flashcards";
  nome_original: string;
  content: unknown;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_used?: number;
  chunks_citados?: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  document_ids: string[];
  titulo?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}
