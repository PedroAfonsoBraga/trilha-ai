import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


# ──────────────────────────────────────────────
#  Sentry (mock-aware)
# ──────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )
    print("[Sentry] Inicializado com DSN configurado")
else:
    print("[MOCK] Sentry não configurado — monitoramento desativado")


# ──────────────────────────────────────────────
#  Upload jobs — retomada após restart (Fase 6)
# ──────────────────────────────────────────────
def _mark_stale_upload_jobs_failed() -> None:
    """Marca jobs 'processing' órfãos como failed ao iniciar a aplicação.

    O worker asyncio in-process é perdido em restart/deploy. Em vez de
    retomar um estado intermediário potencialmente inconsistente, falhamos
    o job e o usuário pode fazer upload novamente (idempotente via cache).
    """
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        print("[MOCK] Supabase não configurado — jobs órfãos não verificados")
        return

    try:
        from supabase import create_client
        supabase = create_client(supabase_url, service_key)
        result = (
            supabase.table("upload_jobs")
            .update({
                "status": "failed",
                "stage": "upsert",
                "error_msg": "Processo reiniciado antes da conclusão. Faça upload novamente.",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("status", "processing")
            .execute()
        )
        affected = len(result.data or [])
        if affected > 0:
            print(f"[upload-jobs] {affected} job(s) órfão(s) marcado(s) como failed")
    except Exception as e:
        print(f"[upload-jobs] Erro ao marcar jobs órfãos: {e}")

from app.routers import (
    billing, documents, sharing, profile, notifications,
    chat, library, flashcards, dashboard, user, admin,
    cronograma,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _mark_stale_upload_jobs_failed()
    yield


app = FastAPI(
    title="Trilha API",
    description="O GPS do concurseiro — do edital à aprovação",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(sharing.router, prefix="/api/share", tags=["sharing"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["flashcards"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(cronograma.router, prefix="/api/cronograma", tags=["cronograma"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
