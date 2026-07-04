import asyncio
import json
import logging
import os
import uuid
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse

from app.middleware.auth import get_current_user
from app.services import (
    pdf_extractor, edital_parser,
    flashcard_service, anki_service, rate_limiter, progress_service,
    embedding_service, chunking_service, search_service, pdf_cache_service,
    upload_job_service,
)

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


def _insert_chunks_from_cache(
    supabase,
    doc_id: str,
    user_id: str,
    chunks: List[Dict],
    embedding_model: str,
) -> int:
    """Insere chunks pré-computados do cache no document_chunks usando batch insert."""
    if not chunks:
        return 0

    chunks_to_insert = [
        {
            "document_id": doc_id,
            "user_id": user_id,
            "chunk_index": chunk.get("chunk_index", 0),
            "content": chunk.get("content", ""),
            "token_count": chunk.get("token_count"),
            "embedding": chunk.get("embedding"),
            "embedding_model": embedding_model,
        }
        for chunk in chunks if chunk.get("embedding")
    ]

    if not chunks_to_insert:
        return 0

    supabase.table("document_chunks").insert(chunks_to_insert).execute()
    return len(chunks_to_insert)


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
    file_hash = pdf_cache_service.make_file_hash(file_bytes)

    embedding_model = embedding_service.get_doc_model()

    # Verifica cache global por hash + modelo de embedding
    cached = pdf_cache_service.get_cached_document(file_hash, embedding_model)

    doc_id = str(uuid.uuid4())
    ext = "pdf" if "pdf" in content_type else "docx"
    storage_path = f"{user['id']}/{doc_id}.{ext}"

    supabase = get_admin_supabase()

    # Cache hit: documento já foi processado antes — resposta instantânea
    if cached:
        # Storage upload (arquivo único por path mesmo em cache hit)
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )

        texto_extraido = cached.get("texto_extraido")
        markdown_text = cached.get("markdown_text")
        page_count = cached.get("page_count")
        chunks_from_cache = cached.get("chunks_jsonb") or []

        metadata = {
            "nome_original": file.filename,
            "tamanho_bytes": len(file_bytes),
            "file_hash": file_hash,
        }
        if markdown_text:
            metadata["markdown_text"] = markdown_text
            metadata["page_count"] = page_count

        supabase.table("documents").insert({
            "id": doc_id,
            "user_id": user["id"],
            "tipo": tipo,
            "nome_original": file.filename or "sem_nome.pdf",
            "storage_path": storage_path,
            "texto_extraido": texto_extraido,
            "markdown_text": markdown_text,
            "metadata": metadata,
        }).execute()

        if chunks_from_cache:
            inserted = _insert_chunks_from_cache(supabase, doc_id, user["id"], chunks_from_cache, embedding_model)
            logger.info("Chunks copiados do cache para doc=%s: %d", doc_id[:8], inserted)

        rate_limiter.increment_usage(user["id"], feature_key)

        return {
            "id": doc_id,
            "tipo": tipo,
            "nome_original": file.filename,
            "texto_extraido_length": len(texto_extraido) if texto_extraido else 0,
            "cached": True,
            "job_id": None,
        }

    # Cache miss: cria documento vazio e enfileira job assíncrono
    supabase.storage.from_("documents").upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "false"},
    )

    metadata = {
        "nome_original": file.filename,
        "tamanho_bytes": len(file_bytes),
        "file_hash": file_hash,
    }

    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user["id"],
        "tipo": tipo,
        "nome_original": file.filename or "sem_nome.pdf",
        "storage_path": storage_path,
        "texto_extraido": None,
        "markdown_text": None,
        "metadata": metadata,
    }).execute()

    job_result = supabase.table("upload_jobs").insert({
        "user_id": user["id"],
        "doc_id": doc_id,
        "status": "queued",
        "stage": "queued",
        "progress": 0,
    }).execute()

    if not job_result.data:
        raise HTTPException(status_code=500, detail="Falha ao criar job de upload")

    job_id = job_result.data[0]["id"]

    task = asyncio.create_task(upload_job_service.run_upload_job(
        job_id=job_id,
        doc_id=doc_id,
        user_id=user["id"],
        file_bytes=file_bytes,
        content_type=content_type,
        filename=file.filename or "documento.pdf",
        tipo=tipo,
        embedding_model=embedding_model,
    ))
    task.add_done_callback(
        lambda t: logger.error("Job %s falhou inesperadamente: %s", job_id, t.exception())
        if t.exception() else None
    )

    rate_limiter.increment_usage(user["id"], feature_key)

    return Response(
        status_code=202,
        content=json.dumps({
            "id": doc_id,
            "job_id": job_id,
            "tipo": tipo,
            "nome_original": file.filename,
            "cached": False,
        }),
        media_type="application/json",
    )


@router.get("/upload/{job_id}/stream")
async def upload_progress_stream(job_id: str, user: dict = Depends(get_current_user)):
    """Stream de progresso do upload via SSE.

    Emite eventos a cada ~1s com status, estágio e progresso do job.
    Encerra automaticamente quando o job atinge 'done' ou 'failed'.
    """
    supabase = get_admin_supabase()

    result = (
        supabase.table("upload_jobs")
        .select("id")
        .eq("id", job_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    async def event_generator():
        while True:
            res = (
                supabase.table("upload_jobs")
                .select("status, stage, progress, error_msg")
                .eq("id", job_id)
                .eq("user_id", user["id"])
                .limit(1)
                .execute()
            )
            if not res.data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Job não encontrado'})}\n\n"
                break

            job = res.data[0]
            payload = {
                "type": "progress",
                "status": job["status"],
                "stage": job["stage"],
                "progress": job["progress"],
                "error_msg": job.get("error_msg"),
            }
            yield f"data: {json.dumps(payload)}\n\n"

            if job["status"] in ("done", "failed"):
                break

            await asyncio.sleep(2.0)

    return EventSourceResponse(event_generator())


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

    flashcards = await flashcard_service.gerar_flashcards_ia(texto, max_cards=max_cards, user_id=user["id"])

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
        chunks = await search_service.rerank_chunks(query=query, chunks=chunks, top_k=5, user_id=user["id"])

    return {"chunks": chunks, "total": len(chunks)}


@router.post("/{doc_id}/chunk")
async def chunk_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = _fetch_doc(doc_id, user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    metadata = doc.get("metadata") or {}
    file_hash = metadata.get("file_hash")
    embedding_model = embedding_service.get_doc_model()

    supabase = get_admin_supabase()

    # Tenta usar cache de chunks/embeddings
    if file_hash:
        cached = pdf_cache_service.get_cached_document(file_hash, embedding_model)
        if cached:
            chunks_from_cache = cached.get("chunks_jsonb") or []
            if chunks_from_cache and any(c.get("embedding") for c in chunks_from_cache):
                supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user["id"]).execute()
                inserted = _insert_chunks_from_cache(supabase, doc_id, user["id"], chunks_from_cache, embedding_model)
                logger.info("Cache hit no chunk para doc=%s: %d chunks copiados", doc_id[:8], inserted)
                return {"chunks": inserted, "document_id": doc_id, "cached": True}

    # Prefere Markdown estruturado (LlamaParse) para chunking,
    # fallback para texto_extraido (PyMuPDF)
    texto_para_chunk = metadata.get("markdown_text") or doc.get("texto_extraido")
    if not texto_para_chunk:
        raise HTTPException(status_code=400, detail="Documento sem texto extraído")

    doc_type = doc.get("tipo", "pdf_generico")

    supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user["id"]).execute()

    chunks = chunking_service.chunk_by_type(texto_para_chunk, doc_type)
    if not chunks:
        raise HTTPException(status_code=400, detail="Não foi possível gerar chunks do documento")

    texts = [c.content for c in chunks]

    try:
        embeddings = await embedding_service.gerar_embeddings_batch(texts, input_type="document", model=embedding_model)
    except Exception as e:
        logger.error(f"Falha ao gerar embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao gerar embeddings: {str(e)}")

    for i, chunk in enumerate(chunks):
        if i < len(embeddings):
            # O conteudo ja preserva a secao via \n\n.join() em chunk_by_type
            supabase.table("document_chunks").insert({
                "document_id": doc_id,
                "user_id": user["id"],
                "chunk_index": chunk.index,
                "content": chunk.content,
                "token_count": chunk.token_count,
                "embedding": embeddings[i],
                "embedding_model": embedding_model,
            }).execute()

    # Salva chunks+embeddings no cache para reuso futuro
    if file_hash:
        pdf_cache_service.set_cached_document(
            file_hash=file_hash,
            embedding_model=embedding_model,
            texto_extraido=doc.get("texto_extraido"),
            markdown_text=metadata.get("markdown_text") or doc.get("markdown_text"),
            chunks=chunks,
            embeddings=embeddings,
            page_count=metadata.get("page_count"),
        )

    return {"chunks": len(chunks), "document_id": doc_id, "cached": False}
