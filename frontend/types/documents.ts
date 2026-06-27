export interface Document {
  id: string;
  user_id: string;
  tipo: "edital" | "pdf_generico";
  nome_original: string;
  storage_path: string;
  texto_extraido: string | null;
  metadata: DocumentMetadata;
  tags: string[];
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

export interface LibraryDocument {
  id: string;
  user_id: string;
  tipo: "edital" | "pdf_generico";
  nome_original: string;
  storage_path: string;
  texto_extraido: string | null;
  metadata: DocumentMetadata;
  tags: string[];
  processado: boolean;
  created_at: string;
}

export interface LibraryResponse {
  documents: LibraryDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  similarity: number;
  nome_original: string;
  tipo: string;
  tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface FlashcardReview {
  id: string;
  user_id: string;
  flashcard_id: string;
  quality: number;
  easiness_factor_before: number;
  easiness_factor_after: number;
  interval_days_before: number;
  interval_days_after: number;
  repetitions_before: number;
  repetitions_after: number;
  reviewed_at: string;
}

export interface TagPerformance {
  total_reviews: number;
  acertos: number;
  erros: number;
  avg_quality: number;
  cards_count: number;
}

export interface FlashcardReportGeral {
  total_cards: number;
  total_reviews: number;
  avg_easiness: number;
  avg_quality: number;
  acertos: number;
  erros: number;
  precisao: number;
  cards_mastered: number;
  cards_learning: number;
  cards_due_today: number;
}

export interface FlashcardReport {
  geral: FlashcardReportGeral;
  por_tag: Record<string, TagPerformance>;
}

export interface DueFlashcardsResponse {
  cards: Flashcard[];
  total: number;
}

export interface FeatureUsage {
  usado: number;
  limite: number | null;
}

export interface PlanUsage {
  mes_ano: string;
  plano: string;
  features: Record<string, FeatureUsage>;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  current_period_end: string | null;
  has_portal: boolean;
}

export interface TccSection {
  titulo: string;
  tipo: string;
  pagina_estimada: number | null;
  completude: string;
  sugestoes: string[];
}

export interface TccAnalysis {
  secoes: TccSection[];
  estrutura_geral: string;
  secoes_ausentes: string[];
  recomendacoes_estrutura: string[];
}

export interface TccReviewIssue {
  trecho: string;
  tipo: string;
  gravidade: string;
  sugestao_generica: string;
}

export interface TccReview {
  problemas: TccReviewIssue[];
  resumo_geral: string;
  pontos_fortes: string[];
}

export interface TccReferenceElementos {
  autor: string;
  titulo: string;
  edicao: string;
  local: string;
  editora: string;
  ano: string;
}

export interface TccReference {
  texto_extraido: string;
  elementos_obrigatorios: TccReferenceElementos;
  conforme_abnt: boolean;
  problemas: string[];
  sugestao_correcao: string;
}

export interface TccReferences {
  referencias: TccReference[];
  total_referencias: number;
  conformidade_geral: number;
  recomendacoes: string[];
}

export interface TccReport {
  estrutura: TccAnalysis;
  revisao: TccReview;
  referencias: TccReferences;
}
