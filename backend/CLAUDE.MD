# Trilha — Backend

## Stack
- FastAPI (Python 3.11)
- Async/await obrigatório em todas as rotas
- Deploy: Railway
- Gerenciador de pacotes: uv (não pip, não poetry)

## Estrutura de pastas
backend/
├── app/
│   ├── main.py              ← app FastAPI, CORS, routers
│   ├── routers/
│   │   ├── documents.py     ← parser de edital, cronograma, flashcards
│   │   ├── flashcards.py    ← revisão espaçada SM-2
│   │   ├── billing.py       ← webhooks Stripe
│   │   ├── sharing.py       ← links públicos de export
│   │   ├── profile.py       ← perfil do usuário, limites, assinatura
│   │   ├── notifications.py ← preferências de notificação
│   │   ├── chat.py          ← chat RAG com documentos
│   │   ├── library.py       ← biblioteca com busca semântica
│   │   ├── dashboard.py     ← dashboard consolidado
│   │   ├── user.py          ← custos e exclusão LGPD
│   │   ├── admin.py         ← administração
│   │   └── auth.py          ← validação de token Supabase
│   ├── services/
│   │   ├── pdf_extractor.py ← extração texto (PyMuPDF + LlamaParse)
│   │   ├── _pymupdf_extractor.py ← fallback PyMuPDF (interno)
│   │   ├── llama_parser.py  ← parser LlamaParse (Markdown)
│   │   ├── edital_parser.py ← parser de editais com IA
│   │   ├── schedule_generator.py ← fallback de cronograma (editais sem tópicos)
│   │   ├── ics_service.py   ← geração .ics calendário
│   │   ├── flashcard_service.py ← geração flashcards via IA
│   │   ├── anki_service.py  ← geração .apkg (genanki)
│   │   ├── rate_limiter.py  ← limites por plano
│   │   ├── review_service.py ← notificações de revisão
│   │   ├── spaced_repetition_service.py ← motor SM-2
│   │   ├── dashboard_service.py ← orquestrador do dashboard
│   │   ├── llm_client.py    ← cliente DeepSeek V4 Flash (OpenRouter, OpenAI-compatible) compartilhado
    │   │   ├── cache_service.py ← cache de outputs de IA
    │   │   ├── chunking_service.py ← chunking inteligente
    │   │   ├── embedding_service.py ← embeddings Voyage (voyage-4-large docs + voyage-4-lite queries, feature flag)
    │   │   ├── pdf_cache_service.py ← cache global de PDFs parseados/chunkados (hash)
    │   │   ├── upload_job_service.py ← worker assíncrono de pipeline de upload
    │   │   ├── search_service.py ← busca semântica pgvector
│   │   ├── chat_service.py  ← chat RAG com streaming
│   │   ├── progress_service.py ← progresso do aluno
│   │   └── admin_service.py ← administração
│   ├── models/
│   │   ├── requests.py      ← Pydantic request models
│   │   └── responses.py     ← Pydantic response models
│   └── middleware/
│       ├── auth.py          ← validar JWT Supabase em cada request
│       └── rate_limit.py    ← limites por plano
├── tests/
└── pyproject.toml

## Regras obrigatórias
- TODAS as rotas são async def — sem exceção
- Autenticação: validar JWT do Supabase em TODA rota protegida
  via middleware/auth.py — nunca confiar no user_id vindo do body
- Rate limiting: verificar plano ANTES de chamar a IA
- Erros: sempre retornar JSONResponse com código HTTP correto
- Logs: usar structlog (JSON) — sem print() em produção
- Nunca commitar .env — usar variáveis de ambiente do Railway

## Padrão de autenticação
# Em toda rota protegida:
async def get_current_user(
    authorization: str = Header(...),
    supabase: Client = Depends(get_supabase)
) -> User:
    token = authorization.replace("Bearer ", "")
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401)
    return user.user

## Padrão de rate limiting por plano
LIMITS = {
    "free": {"editais": 3, "pdfs": 5, "flashcards_per_pdf": 5},
    "estudante": {"editais": -1, "pdfs": -1, "flashcards_per_pdf": -1},
    "pro": {"editais": -1, "pdfs": -1, "flashcards_per_pdf": -1},
}
# -1 = ilimitado
# Verificar usage na tabela usage_tracking antes de processar

## Padrão de chamada à IA (llm_client.py)
# Usar OpenAI Chat Completions API via OpenRouter (DeepSeek V4 Flash)
response = await client.chat.completions.create(
    model="deepseek/deepseek-v4-flash",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_text},
    ],
    max_tokens=16384,
    temperature=0.3,
)
# Logar sempre: tokens de input e output via _log_ai_usage()

## Processamento de PDF
# Ordem de tentativa:
# 1. PyMuPDF (fitz) — PDFs com texto nativo (rápido, gratuito)
# 2. Tesseract OCR — PDFs escaneados (lento, gratuito)
# Nunca usar AWS Textract ou Google Vision no MVP (custo)

## Geração de Anki (.apkg)
import genanki
# Sempre gerar com deck_id fixo por usuário+documento
# Formato do flashcard: frente = pergunta, verso = resposta + contexto
# Incluir tag com nome do concurso/disciplina

## Variáveis de ambiente necessárias
SUPABASE_URL= https://kemuelptejyczyobfxuj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   ← nunca o anon key no backend
NEXT_PUBLIC_SUPABASE_URL=https://kemuelptejyczyobfxuj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jBdStyfmeE-m423cg5-Q8Q_cTpxdqyM
OPENROUTER_API_KEY= 
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VOYAGE_API_KEY=
RESEND_API_KEY=

## Upload de PDFs (Sprint 15)
# Pipeline assíncrono:
#   1. POST /api/documents/upload valida, faz upload do storage e enfileira job.
#   2. Cache hit (mesmo PDF já processado): retorna 200 imediato.
#   3. Cache miss: retorna 202 { id, job_id }.
#   4. upload_job_service.run_upload_job() executa parse → chunk → embed → upsert.
#   5. GET /api/documents/upload/{job_id}/stream retorna SSE com progresso.
#   6. main.py marca jobs em 'processing' órfãos como 'failed' no startup.
#
# Cache por hash:
#   - sha256(file_bytes) + embedding_model compõem a chave.
#   - Tabela document_hash_cache armazena texto, markdown e chunks+embeddings.
#
# Migração de embeddings:
#   - scripts/reindex_voyage4.py → re-indexa todos os docs com voyage-4-large.
#   - scripts/check_voyage4_cutover.py → verifica se cutover é seguro.
#   - Feature flag EMBEDDING_MODEL_VERSION controla modelo ativo.

## Custos — monitorar sempre
# Antes de qualquer chamada IA, logar estimativa de custo
# Claude Sonnet: $3/M input, $15/M output
# Custos de embeddings (atualizados Sprint 15)
# voyage-3 (legado):   $0.06/M tokens
# voyage-4-large:      $0.12/M tokens (200M tokens free)
# voyage-4-lite:       $0.02/M tokens  (200M tokens free)
# Registrar na tabela ai_usage_log: user_id, tokens, custo_estimado, feature

## Testes
- pytest + pytest-asyncio para todas as rotas
- Mockar chamadas Anthropic e Stripe nos testes (nunca chamar API real)
- Coverage mínimo: 80% nos services críticos (ai_service, stripe_service)
