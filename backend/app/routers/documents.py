import logging
import os
import uuid
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.middleware.auth import get_current_user
from app.services import pdf_extractor, edital_parser, schedule_generator, ics_service, fichamento_service, flashcard_service, anki_service, rate_limiter, progress_service, embedding_service, chunking_service, search_service

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
    content_type = file.content_type or ""
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF e DOCX são aceitos")

    if tipo not in ("edital", "pdf_generico"):
        raise HTTPException(status_code=400, detail="Tipo deve ser 'edital' ou 'pdf_generico'")

    feature_key = "edital" if tipo == "edital" else "pdf"
    if not rate_limiter.check_rate_limit(user["id"], feature_key):
        raise HTTPException(status_code=429, detail="Limite de uploads atingido para o plano Free")

    file_bytes = await file.read()

    doc_id = str(uuid.uuid4())
    ext = "pdf" if "pdf" in content_type else "docx"
    storage_path = f"{user['id']}/{doc_id}.{ext}"

    supabase = get_admin_supabase()
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

    plano = rate_limiter.get_user_plan(user["id"])
    ics_bytes = ics_service.criar_calendario_ics(cronograma, plano=plano)

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

    plano = rate_limiter.get_user_plan(user["id"])
    docx_bytes = fichamento_service.criar_docx_fichamento(fichamento, plano=plano)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=fichamento_{doc_id[:8]}.docx"
        },
    )


# ============================================================
# Flashcards
# ============================================================


@router.post("/{doc_id}/flashcards")
async def generate_flashcards(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    texto = doc.get("texto_extraido")
    if not texto:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")

    if not rate_limiter.check_flashcard_per_document_limit(user["id"], doc_id, max_free=5):
        raise HTTPException(status_code=429, detail="Limite de 5 flashcards por PDF no plano Free")

    plano = rate_limiter.get_user_plan(user["id"])
    max_cards = 5 if plano == "free" else 20

    flashcards = await flashcard_service.gerar_flashcards_ia(texto, max_cards=max_cards)

    supabase = get_admin_supabase()
    inserted = []
    for fc in flashcards:
        result = (
            supabase.table("flashcards")
            .insert({
                "user_id": user["id"],
                "document_id": doc_id,
                "frente": fc.get("frente", ""),
                "verso": fc.get("verso", ""),
                "tags": fc.get("tags", []),
            })
            .execute()
        )
        if result.data:
            inserted.append(result.data[0])

    return {"flashcards": inserted, "total": len(inserted)}


@router.get("/{doc_id}/flashcards")
async def list_flashcards(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    supabase = get_admin_supabase()
    result = (
        supabase.table("flashcards")
        .select("*")
        .eq("user_id", user["id"])
        .eq("document_id", doc_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


@router.get("/{doc_id}/flashcards.apkg")
async def download_flashcards_apkg(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"], select="metadata, nome_original")
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    supabase = get_admin_supabase()
    result = (
        supabase.table("flashcards")
        .select("*")
        .eq("user_id", user["id"])
        .eq("document_id", doc_id)
        .order("created_at")
        .execute()
    )

    flashcards = result.data or []
    if not flashcards:
        raise HTTPException(status_code=400, detail="Nenhum flashcard gerado para este documento")

    plano = rate_limiter.get_user_plan(user["id"])
    nome = doc.get("nome_original", "documento").replace(".pdf", "")
    apkg_bytes = anki_service.criar_apkg(flashcards, deck_name=nome, plano=plano)

    return Response(
        content=apkg_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename=flashcards_{doc_id[:8]}.apkg"
        },
    )


# ============================================================
# Progress tracking
# ============================================================


@router.get("/{doc_id}/progress")
async def get_document_progress(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    progress = progress_service.get_progress(user["id"], doc_id)
    summary = progress_service.get_progress_summary(user["id"], doc_id)
    return {"progress": progress, "summary": summary}


@router.post("/{doc_id}/progress")
async def mark_document_progress(
    doc_id: str,
    body: dict,
    user: dict = Depends(get_current_user),
):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    semana = body.get("semana")
    disciplina = body.get("disciplina")
    if not semana or not disciplina:
        raise HTTPException(status_code=400, detail="semana e disciplina são obrigatórios")

    result = progress_service.mark_progress(
        user_id=user["id"],
        document_id=doc_id,
        semana=int(semana),
        disciplina=str(disciplina),
        completed=body.get("completed", True),
        horas_estudadas=float(body.get("horas_estudadas", 0)),
        nota=body.get("nota"),
    )
    return result


# ============================================================
# Cronograma ajustado / urgência / recálculo
# ============================================================


@router.post("/{doc_id}/cronograma/ajustado")
async def generate_adjusted_schedule(doc_id: str, user: dict = Depends(get_current_user)):
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
            break

    progress = progress_service.get_progress(user["id"], doc_id)

    cronograma = schedule_generator.gerar_cronograma_ajustado(
        disciplinas=disciplinas,
        data_inicio=metadata.get("data_inicio", None),
        data_prova=data_prova,
        progress=progress,
    )

    metadata["cronograma_ajustado"] = cronograma
    supabase = get_admin_supabase()
    supabase.table("documents").update({"metadata": metadata}).eq("id", doc_id).execute()

    return cronograma


@router.post("/{doc_id}/cronograma/urgencia")
async def generate_urgency_schedule(
    doc_id: str,
    body: dict = {},
    user: dict = Depends(get_current_user),
):
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
            break

    if not data_prova and datas:
        data_prova = datas[-1].get("data")

    if not data_prova:
        raise HTTPException(status_code=400, detail="Data da prova não encontrada no edital")

    horas_por_dia = body.get("horas_por_dia", 8)

    cronograma = schedule_generator.gerar_cronograma_urgencia(
        disciplinas=disciplinas,
        data_prova=data_prova,
        horas_por_dia=horas_por_dia,
    )

    metadata["cronograma_urgencia"] = cronograma
    supabase = get_admin_supabase()
    supabase.table("documents").update({"metadata": metadata}).eq("id", doc_id).execute()

    return cronograma


@router.post("/{doc_id}/cronograma/recalcular")
async def recalculate_schedule(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.get("metadata") or {}
    cronograma_original = metadata.get("cronograma", [])
    if not cronograma_original:
        raise HTTPException(status_code=400, detail="Cronograma ainda não foi gerado")

    parsed = metadata.get("parsed", {})
    datas = parsed.get("datas_importantes", [])

    data_prova = None
    for d in datas:
        ev = (d.get("evento") or "").lower()
        if any(k in ev for k in ["prova", "avaliação", "aplicação", "concurso"]):
            data_prova = d.get("data")
            break

    if not data_prova and datas:
        data_prova = datas[-1].get("data")

    if not data_prova:
        raise HTTPException(status_code=400, detail="Data da prova não encontrada")

    progress = progress_service.get_progress(user["id"], doc_id)

    cronograma = schedule_generator.recalcular_por_atraso(
        cronograma_original=cronograma_original,
        progress=progress,
        data_prova=data_prova,
    )

    metadata["cronograma"] = cronograma
    supabase = get_admin_supabase()
    supabase.table("documents").update({"metadata": metadata}).eq("id", doc_id).execute()

    return cronograma


@router.post("/search")
async def search_documents(body: dict, user: dict = Depends(get_current_user)):
    query: str = body.get("query", "")
    document_ids: List[str] = body.get("document_ids", [])
    top_k: int = body.get("top_k", 10)

    if not query:
        raise HTTPException(status_code=400, detail="query é obrigatória")

    if not document_ids:
        raise HTTPException(status_code=400, detail="document_ids é obrigatório")

    supabase = get_admin_supabase()
    result = (
        supabase.table("documents")
        .select("id")
        .eq("user_id", user["id"])
        .in_("id", document_ids)
        .execute()
    )
    owned_ids = {d["id"] for d in (result.data or [])}
    valid_ids = [did for did in document_ids if did in owned_ids]

    if not valid_ids:
        raise HTTPException(status_code=400, detail="Nenhum documento válido")

    chunks = await search_service.search_similar_chunks(
        query=query,
        document_ids=valid_ids,
        user_id=user["id"],
        top_k=top_k,
    )

    if len(chunks) > 5:
        chunks = await search_service.rerank_chunks(query=query, chunks=chunks, top_k=5)

    return {"chunks": chunks, "total": len(chunks)}


@router.post("/{doc_id}/chunk")
async def chunk_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    texto = doc.get("texto_extraido")
    if not texto:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")

    supabase = get_admin_supabase()
    supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user["id"]).execute()

    chunks = chunking_service.chunk_semantico(texto)
    if not chunks:
        raise HTTPException(status_code=400, detail="Não foi possível gerar chunks do documento")

    texts = [c.content for c in chunks]

    try:
        embeddings = await embedding_service.gerar_embeddings_batch(texts, input_type="document")
    except Exception as e:
        logger.error(f"Falha ao gerar embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao gerar embeddings: {str(e)}")

    for i, chunk in enumerate(chunks):
        if i < len(embeddings):
            supabase.table("document_chunks").insert({
                "document_id": doc_id,
                "user_id": user["id"],
                "chunk_index": chunk.index,
                "content": chunk.content,
                "token_count": chunk.token_count,
                "embedding": embeddings[i],
            }).execute()

    return {"chunks": len(chunks), "document_id": doc_id}
