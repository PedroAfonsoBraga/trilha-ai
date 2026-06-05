import logging
import os
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.middleware.auth import get_current_user
from app.services import pdf_extractor, edital_parser, schedule_generator, ics_service, fichamento_service, rate_limiter

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_admin_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _fetch_doc(doc_id: str, user_id: str, select: str = "*"):
    supabase = get_admin_supabase()
    result = (
        supabase.table("documents")
        .select(select)
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    tipo: str = Form("edital"),
    user: dict = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    if tipo not in ("edital", "pdf_generico"):
        raise HTTPException(status_code=400, detail="Tipo deve ser 'edital' ou 'pdf_generico'")

    feature_key = "edital" if tipo == "edital" else "pdf"
    if not rate_limiter.check_rate_limit(user["id"], feature_key):
        raise HTTPException(status_code=429, detail="Limite de uploads atingido para o plano Free")

    pdf_bytes = await file.read()

    doc_id = str(uuid.uuid4())
    storage_path = f"{user['id']}/{doc_id}.pdf"

    supabase = get_admin_supabase()
    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "false"},
    )

    texto_extraido = None
    try:
        texto_extraido = pdf_extractor.extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        logger.error(f"Falha na extração de texto: {e}")

    metadata = {
        "nome_original": file.filename,
        "tamanho_bytes": len(pdf_bytes),
    }

    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user["id"],
        "tipo": tipo,
        "nome_original": file.filename or "sem_nome.pdf",
        "storage_path": storage_path,
        "texto_extraido": texto_extraido,
        "metadata": metadata,
    }).execute()

    rate_limiter.increment_usage(user["id"], feature_key)

    return {
        "id": doc_id,
        "tipo": tipo,
        "nome_original": file.filename,
        "texto_extraido_length": len(texto_extraido) if texto_extraido else 0,
    }


@router.get("")
async def list_documents(user: dict = Depends(get_current_user)):
    supabase = get_admin_supabase()
    result = (
        supabase.table("documents")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return doc


@router.get("/{doc_id}/text")
async def get_document_text(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"], select="texto_extraido, nome_original")
    if not doc or not doc.get("texto_extraido"):
        raise HTTPException(status_code=404, detail="Texto não disponível")
    return {"texto": doc["texto_extraido"]}


@router.post("/{doc_id}/parse")
async def parse_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    texto = doc.get("texto_extraido")
    if not texto:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")

    parsed = await edital_parser.parse_edital(texto)

    supabase = get_admin_supabase()
    supabase.table("documents").update({
        "metadata": {"parsed": parsed},
        "processado": True,
    }).eq("id", doc_id).execute()

    return parsed


@router.post("/{doc_id}/cronograma")
async def generate_schedule(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.get("metadata") or {}
    parsed = metadata.get("parsed", {})

    disciplinas = parsed.get("disciplinas", [])
    datas = parsed.get("datas_importantes", [])

    data_prova = None
    for d in datas:
        ev = (d.get("evento") or "").lower()
        if any(k in ev for k in ["prova", "avaliação", "aplicação", "concurso"]):
            data_prova = d.get("data")

    cronograma = schedule_generator.gerar_cronograma(
        disciplinas=disciplinas,
        data_prova=data_prova,
    )

    metadata["cronograma"] = cronograma
    supabase = get_admin_supabase()
    supabase.table("documents").update({
        "metadata": metadata,
    }).eq("id", doc_id).execute()

    return cronograma


@router.get("/{doc_id}/cronograma.ics")
async def download_ics(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"], select="metadata, nome_original")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.get("metadata") or {}
    cronograma = metadata.get("cronograma", [])

    if not cronograma:
        raise HTTPException(status_code=400, detail="Cronograma ainda não foi gerado")

    ics_bytes = ics_service.criar_calendario_ics(cronograma)

    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=cronograma_{doc_id[:8]}.ics"
        },
    )


@router.post("/{doc_id}/fichamento")
async def generate_fichamento(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    texto = doc.get("texto_extraido")
    if not texto:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")

    fichamento = await fichamento_service.gerar_fichamento_ia(texto)

    metadata = doc.get("metadata") or {}
    metadata["fichamento"] = fichamento
    supabase = get_admin_supabase()
    supabase.table("documents").update({
        "metadata": metadata,
    }).eq("id", doc_id).execute()

    return fichamento


@router.get("/{doc_id}/fichamento.docx")
async def download_fichamento_docx(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"], select="metadata, nome_original")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.get("metadata") or {}
    fichamento = metadata.get("fichamento")

    if not fichamento:
        raise HTTPException(status_code=400, detail="Fichamento ainda não foi gerado")

    docx_bytes = fichamento_service.criar_docx_fichamento(fichamento)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=fichamento_{doc_id[:8]}.docx"
        },
    )
