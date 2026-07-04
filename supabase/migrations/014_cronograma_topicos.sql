-- Migration 014: Cronograma por Tópicos
-- Data: 2026-06-30
--
-- Cria tabelas para extração de tópicos de editais e agendamento por tópico.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_cronograma_blocos_user_edital_data;
--   DROP INDEX IF EXISTS idx_cronograma_blocos_user_edital;
--   DROP INDEX IF EXISTS idx_edital_topicos_edital_ordem;
--   DROP TABLE IF EXISTS cronograma_config CASCADE;
--   DROP TABLE IF EXISTS cronograma_blocos CASCADE;
--   DROP TABLE IF EXISTS edital_topicos CASCADE;

-- ============================================================
-- Tabela de tópicos extraídos do edital
-- ============================================================
CREATE TABLE edital_topicos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id     UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  disciplina    TEXT NOT NULL,
  topico        TEXT NOT NULL,
  ordem         INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(edital_id, disciplina, topico)
);

ALTER TABLE edital_topicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios veem topicos de seus editais"
  ON edital_topicos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = edital_topicos.edital_id AND documents.user_id = auth.uid()
  ));

CREATE POLICY "servico insere topicos de editais"
  ON edital_topicos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = edital_topicos.edital_id AND documents.user_id = auth.uid()
  ));

CREATE POLICY "servico deleta topicos de editais"
  ON edital_topicos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM documents WHERE documents.id = edital_topicos.edital_id AND documents.user_id = auth.uid()
  ));

-- ============================================================
-- Tabela de blocos do cronograma (um bloco = um tópico em um dia)
-- ============================================================
CREATE TABLE cronograma_blocos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  edital_id     UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  disciplina    TEXT NOT NULL,
  topico        TEXT NOT NULL,
  data          DATE NOT NULL,
  duracao_min   INTEGER NOT NULL CHECK (duracao_min > 0),
  status        TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','concluido','pulado')),
  ordem_no_dia  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cronograma_blocos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios gerenciam seus blocos de cronograma"
  ON cronograma_blocos FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- Configuração do cronograma do usuário por edital
-- ============================================================
CREATE TABLE cronograma_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  edital_id            UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  dias_da_semana       INTEGER[] NOT NULL,
  horas_por_dia        NUMERIC(3,1) NOT NULL,
  reservar_revisao     BOOLEAN DEFAULT true,
  nivel_disciplinas    JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, edital_id)
);

ALTER TABLE cronograma_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios gerenciam suas configs de cronograma"
  ON cronograma_config FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX idx_edital_topicos_edital_ordem
  ON edital_topicos(edital_id, ordem);

CREATE INDEX idx_cronograma_blocos_user_edital
  ON cronograma_blocos(user_id, edital_id);

CREATE INDEX idx_cronograma_blocos_user_edital_data
  ON cronograma_blocos(user_id, edital_id, data);

-- ============================================================
-- Trigger para atualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cronograma_blocos_updated_at
  BEFORE UPDATE ON cronograma_blocos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cronograma_config_updated_at
  BEFORE UPDATE ON cronograma_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
