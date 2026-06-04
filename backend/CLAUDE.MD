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
│   │   ├── concurso.py      ← parser de edital, cronograma
│   │   ├── flashcards.py    ← geração + export .apkg
│   │   ├── fichamento.py    ← fichamento ABNT + export .docx
│   │   ├── billing.py       ← webhooks Stripe
│   │   └── auth.py          ← validação de token Supabase
│   ├── services/
│   │   ├── ai_service.py    ← chamadas Claude API (caching aqui)
│   │   ├── pdf_service.py   ← extração texto (PyMuPDF + Tesseract)
│   │   ├── anki_service.py  ← geração .apkg (genanki)
│   │   ├── docx_service.py  ← geração .docx ABNT (python-docx)
│   │   ├── ics_service.py   ← geração .ics calendário
│   │   ├── rag_service.py   ← embeddings + busca pgvector
│   │   └── stripe_service.py← lógica de billing
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

## Padrão de chamada à IA (ai_service.py)
# SEMPRE usar prompt caching em documentos > 2k tokens
response = await anthropic.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4096,
    system=[{
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral"}  # ← obrigatório
    }],
    messages=[...]
)
# Logar sempre: tokens de input, output e cache_read_input_tokens

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
ANTHROPIC_API_KEY= 
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VOYAGE_API_KEY=
RESEND_API_KEY=

## Custos — monitorar sempre
# Antes de qualquer chamada IA, logar estimativa de custo
# Claude Sonnet: $3/M input, $15/M output
# Voyage-3-lite: $0,02/M tokens
# Registrar na tabela ai_usage_log: user_id, tokens, custo_estimado, feature

## Testes
- pytest + pytest-asyncio para todas as rotas
- Mockar chamadas Anthropic e Stripe nos testes (nunca chamar API real)
- Coverage mínimo: 80% nos services críticos (ai_service, stripe_service)
