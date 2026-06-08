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
