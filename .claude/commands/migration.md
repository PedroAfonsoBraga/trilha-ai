Crie uma nova migration Supabase em supabase/migrations/ para: $ARGUMENTS

Seguir o padrão:
- Arquivo nomeado como: [próximo número]_[descrição_snake_case].sql
- Comentário de rollback completo no topo
- RLS ativo na tabela com política padrão de user_id
- Trigger de updated_at se a tabela tiver esse campo
- Index nos campos de busca frequente
