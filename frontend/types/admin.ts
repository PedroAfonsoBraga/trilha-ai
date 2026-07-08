export interface AdminStats {
  total_usuarios: number;
  total_documentos: number;
  total_chunks: number;
  total_flashcards: number;
  total_mensagens_chat: number;
  storage_bytes: number;
  storage_gb: number;
  custo_ia_total_usd: number;
  custo_ia_mes_usd: number;
  distribuicao_planos: Record<string, number>;
}

export interface AdminUser {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  perfil: string;
  total_documentos: number;
  storage_bytes: number;
  storage_mb: number;
  custo_ia_mes_usd: number;
  ultimo_acesso: string;
  criado_em: string;
}

export interface AdminUsersResponse {
  usuarios: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDocument {
  id: string;
  nome: string;
  tipo: string;
  created_at: string;
  tamanho_bytes: number;
}

export interface AdminUserDetail {
  user_id: string;
  email: string | null;
  nome: string | null;
  plano: string | null;
  perfil: string | null;
  criado_em: string | null;
  subscription: Record<string, unknown> | null;
  documentos: AdminUserDocument[];
  total_documentos: number;
  total_chunks: number;
  total_flashcards: number;
  custo_ia_por_mes: Record<string, number>;
}

// ──────────────────────────────────────────────
//  Painel de custos de IA (Sprint 17)
// ──────────────────────────────────────────────

export interface PeriodoRange {
  de: string;
  ate: string;
}

export interface CustoPorDia {
  data: string;
  custo: number;
}

export interface CustoResumo {
  periodo: PeriodoRange;
  custo_total_periodo: number;
  custo_por_dia: CustoPorDia[];
  tokens_totais: number;
  chamadas_totais: number;
  custo_periodo_anterior: number;
  variacao_percentual: number;
}

export interface CustoPorFeature {
  feature: string;
  custo_total: number;
  tokens_total: number;
  qtd_chamadas: number;
  custo_medio_por_chamada: number;
  percentual_do_total: number;
}

export interface CustoPorUsuarioItem {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  custo_total: number;
  qtd_chamadas: number;
  feature_mais_usada: string;
}

export interface CustoPorUsuarioResponse {
  usuarios: CustoPorUsuarioItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustoPorProvider {
  provider: string;
  model: string;
  custo_total: number;
  qtd_chamadas: number;
  taxa_erro_percentual: number;
  latencia_media_ms: number;
}

export interface CustoOutlierItem {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  custo_total: number;
}

export interface CustoOutliersResponse {
  media: number;
  desvio_padrao: number;
  limite: number;
  desvios: number;
  amostra: number;
  outliers: CustoOutlierItem[];
}

export interface CacheEconomiaPorFeature {
  feature: string;
  economia_usd: number;
}

export interface CustoCacheEconomia {
  economia_total_usd: number;
  chamadas_economizadas: number;
  por_feature: CacheEconomiaPorFeature[];
}

export interface CustoHistoricoItem {
  id: string;
  feature: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cache_hit: boolean;
  duracao_ms: number | null;
  status: string;
  erro_detalhe: string | null;
  custo_estimado_usd: number;
  created_at: string;
  edital_id: string | null;
}

export interface CustoPorFeatureDetalhe {
  feature: string;
  custo_total: number;
  qtd_chamadas: number;
  tokens_total: number;
}

export interface CustoUsuarioDetalhe {
  user_id: string;
  email: string;
  nome: string;
  plano: string;
  plano_desde: string | null;
  subscription: Record<string, unknown> | null;
  custo_total_periodo: number;
  chamadas_total: number;
  por_feature: CustoPorFeatureDetalhe[];
  historico: CustoHistoricoItem[];
}
