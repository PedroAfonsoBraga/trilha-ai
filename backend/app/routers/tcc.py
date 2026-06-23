import logging
import os
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.middleware.auth import get_current_user
from app.services import pdf_extractor, rate_limiter, tcc_service

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _fetch_doc(doc_id: str, user_id: str, select: str = "*"):
    supabase = _get_supabase()
    result = (
        supabase.table("documents")
        .select(select)
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _fetch_text(doc_id: str, user_id: str) -> str:
    doc = _fetch_doc(doc_id, user_id, select="texto_extraido, metadata")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    texto = doc.get("texto_extraido")
    if not texto:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")
    return texto


def _update_metadata(doc_id: str, key: str, value: dict, user_id: str):
    doc = _fetch_doc(doc_id, user_id, select="metadata")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    metadata = doc.get("metadata") or {}
    metadata[key] = value
    supabase = _get_supabase()
    supabase.table("documents").update({"metadata": metadata}).eq("id", doc_id).execute()


@router.post("/upload")
async def upload_tcc(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    content_type = file.content_type or ""
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF e DOCX são aceitos")

    plan = rate_limiter.get_user_plan(user["id"])
    max_limit = 1 if plan == "free" else (3 if plan == "estudante" else None)
    if not rate_limiter.check_rate_limit(user["id"], "tcc", max_free=max_limit or 1):
        raise HTTPException(status_code=429, detail="Limite de uploads de TCC atingido para seu plano")

    file_bytes = await file.read()
    doc_id = str(uuid.uuid4())
    ext = "pdf" if "pdf" in content_type else "docx"
    storage_path = f"{user['id']}/{doc_id}.{ext}"

    supabase = _get_supabase()
    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "false"},
    )

    texto_extraido = None
    try:
        texto_extraido = pdf_extractor.extract_text_from_bytes(file_bytes, content_type)
    except Exception as e:
        logger.error(f"Falha na extração de texto: {e}")

    metadata = {
        "nome_original": file.filename,
        "tamanho_bytes": len(file_bytes),
    }

    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user["id"],
        "tipo": "tcc",
        "nome_original": file.filename or "sem_nome.pdf",
        "storage_path": storage_path,
        "texto_extraido": texto_extraido,
        "metadata": metadata,
    }).execute()

    rate_limiter.increment_usage(user["id"], "tcc")

    return {
        "id": doc_id,
        "tipo": "tcc",
        "nome_original": file.filename,
        "texto_extraido_length": len(texto_extraido) if texto_extraido else 0,
    }


@router.post("/{doc_id}/analyze")
async def analyze_tcc_structure(doc_id: str, user: dict = Depends(get_current_user)):
    texto = _fetch_text(doc_id, user["id"])
    result = await tcc_service.analyze_structure(texto)
    _update_metadata(doc_id, "analise_estrutura", result, user["id"])
    return result


@router.post("/{doc_id}/review")
async def review_tcc_text(doc_id: str, user: dict = Depends(get_current_user)):
    texto = _fetch_text(doc_id, user["id"])
    result = await tcc_service.review_text(texto)
    _update_metadata(doc_id, "revisao_qualidade", result, user["id"])
    return result


@router.post("/{doc_id}/references")
async def check_tcc_references(doc_id: str, user: dict = Depends(get_current_user)):
    texto = _fetch_text(doc_id, user["id"])
    result = await tcc_service.extract_references(texto)
    _update_metadata(doc_id, "referencias_abnt", result, user["id"])
    return result


@router.get("/{doc_id}/report.docx")
async def download_tcc_report(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"], select="metadata, nome_original")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    metadata = doc.get("metadata") or {}
    estrutura = metadata.get("analise_estrutura")
    revisao = metadata.get("revisao_qualidade")
    referencias = metadata.get("referencias_abnt")
    if not estrutura or not revisao or not referencias:
        missing = []
        if not estrutura:
            missing.append("Análise de estrutura")
        if not revisao:
            missing.append("Revisão textual")
        if not referencias:
            missing.append("Referências ABNT")
        raise HTTPException(
            status_code=400,
            detail=f"Execute todas as análises primeiro: {', '.join(missing)}",
        )
    plano = rate_limiter.get_user_plan(user["id"])
    docx_bytes = tcc_service.create_combined_report(estrutura, revisao, referencias, plano=plano)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=relatorio_tcc_{doc_id[:8]}.docx"
        },
    )
