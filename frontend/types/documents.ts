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
  topicos?: string[];
}

export interface ExtractedTopics {
  edital_id: string;
  disciplinas: Disciplina[];
  extracted_at: string;
  has_vague_topics: boolean;
}

export interface UserConfigCronograma {
  dias_da_semana: number[];
  horas_por_dia: number;
  nivel_por_disciplina: Record<string, "fraco" | "medio" | "forte">;
  reservar_revisao: boolean;
  data_prova: string;
}

export interface TopicBlock {
  id?: string;
  disciplina: string;
  topico: string;
  duracao_min: number;
  status: "pendente" | "concluido" | "pulado";
}

export interface DaySchedule {
  date: string;
  blocos: TopicBlock[];
  total_minutos: number;
}

export interface CronogramaPorTopicos {
  edital_id: string;
  user_id: string;
  semanas: DaySchedule[][];
  gerado_em: string;
  config: UserConfigCronograma;
}

export interface CronogramaConfig {
  id?: string;
  user_id: string;
  edital_id: string;
  dias_da_semana: number[];
  horas_por_dia: number;
  reservar_revisao: boolean;
  nivel_disciplinas: Record<string, string>;
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
  export_type: "cronograma" | "flashcards";
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

// ──────────────────────────────────────────────
//  Dashboard — Sprint 8
// ──────────────────────────────────────────────

export interface DashboardProgressoGeral {
  total_documentos: number;
  total_disciplinas: number;
  itens_completados: number;
  total_itens: number;
  taxa_conclusao: number;
  horas_estudadas: number;
}

export interface DashboardStreak {
  dias_consecutivos: number;
  ultimo_dia: string | null;
  maximo_historico: number;
}

export interface DashboardFlashcards {
  pendentes: number;
  revisados_hoje: number;
  total_cards: number;
  taxa_acerto: number;
}

export interface DashboardPrazo {
  evento: string;
  data: string;
  dias_restantes: number;
}

export interface DashboardUrgencia {
  ativo: boolean;
  cards_atrasados: number;
  proximo_prazo: DashboardPrazo | null;
}

export interface DashboardPorConcurso {
  documento_id: string;
  nome: string;
  tipo: string;
  progresso: number;
  total_horas: number;
  total_disciplinas: number;
}

// ──────────────────────────────────────────────
//  Dashboard — Sprint 13 (novos campos)
// ──────────────────────────────────────────────

export interface DashboardEditalAtivo {
  documento_id: string;
  nome: string;
  orgao: string;
  banca: string;
  cargo: string;
  data_prova: string | null;
  dias_restantes: number | null;
  progresso_geral: number;
  total_disciplinas: number;
  disciplinas_concluidas: number;
}

export interface DashboardCronogramaItem {
  disciplina: string;
  topico?: string;
  horas_sugeridas: number;
  progresso_pct: number;
  status: "em_dia" | "atrasado" | "critico" | "a_iniciar" | "pendente" | "concluido" | "pulado";
  dot_color: string;
  banca?: string;
  document_id?: string;
}

export interface DashboardCronogramaHoje {
  dia: string;
  items: DashboardCronogramaItem[];
  mensagem?: string;
}

export interface DashboardDisciplinaRisco {
  disciplina: string;
  nivel: "critico" | "atencao";
  mensagem: string;
  peso_pct: number;
  progresso_pct: number;
  dias_sem_estudo: number | null;
}

export interface DashboardAtividadeItem {
  tipo: "estudo" | "upload" | "revisao";
  descricao: string;
  data_iso: string;
  data_relativa: string;
}

export interface DashboardData {
  progresso_geral: DashboardProgressoGeral | null;
  streak: DashboardStreak | null;
  flashcards: DashboardFlashcards | null;
  urgencia: DashboardUrgencia | null;
  por_concurso: DashboardPorConcurso[] | null;
  edital_ativo: DashboardEditalAtivo | null;
  cronograma_hoje: DashboardCronogramaHoje | null;
  disciplinas_risco: DashboardDisciplinaRisco[] | null;
  atividade_recente: DashboardAtividadeItem[] | null;
}

// ──────────────────────────────────────────────
//  Custos de IA — Sprint 9
// ──────────────────────────────────────────────

export interface CostFeatureBreakdown {
  chamadas: number;
  input_tokens: number;
  output_tokens: number;
  custo_usd: number;
}

export interface CostModelBreakdown {
  chamadas: number;
  custo_usd: number;
}

export interface UserCostSummary {
  periodo: { inicio: string; fim: string };
  total_chamadas: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_custo_usd: number;
  total_custo_brl: number;
  por_feature: Record<string, CostFeatureBreakdown>;
  por_modelo: Record<string, CostModelBreakdown>;
  orcamento_mensal_usd: number;
  dentro_do_orcamento: boolean;
}
