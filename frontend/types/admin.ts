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
