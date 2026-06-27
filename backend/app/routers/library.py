import logging
import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.services import search_service, embedding_service

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_supabase():
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.get("")
async def list_library(
    tags: Optional[str] = Query(None, description="Tags separadas por vírgula"),
    tipo: Optional[str] = Query(None, description="edital ou pdf_generico"),
    sort: str = Query("created_at", description="Campo de ordenação"),
    order: str = Query("desc", description="asc ou desc"),
    page: int = Query(1, ge=1, description="Página"),
    limit: int = Query(20, ge=1, le=50, description="Itens por página"),
    user: dict = Depends(get_current_user),
):
    supabase = _get_supabase()

    query = supabase.table("documents").select("*", count="exact").eq("user_id", user["id"])

    if tipo and tipo in ("edital", "pdf_generico"):
        query = query.eq("tipo", tipo)

    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            query = query.contains("tags", tag_list)

    valid_sort_fields = {"created_at", "nome_original", "tipo"}
    sort_field = sort if sort in valid_sort_fields else "created_at"
    sort_desc = order.lower() == "desc"

    offset = (page - 1) * limit

    result = (
        query
        .order(sort_field, desc=sort_desc)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "documents": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit,
    }


@router.post("/search")
async def search_library(body: dict, user: dict = Depends(get_current_user)):
    query = body.get("query", "")
    top_k: int = body.get("top_k", 10)

    if not query:
        raise HTTPException(status_code=400, detail="query é obrigatória")

    query_embedding = await embedding_service.gerar_embedding(query, input_type="query")

    supabase = _get_supabase()

    result = (
        supabase.rpc(
            "search_all_chunks",
            {
                "query_embedding": query_embedding,
                "p_user_id": user["id"],
                "p_top_k": top_k,
            },
        )
        .execute()
    )

    chunks = result.data or []

    if len(chunks) > 5:
        try:
            chunks = await search_service.rerank_chunks(query=query, chunks=chunks, top_k=5)
        except Exception:
            pass

    doc_ids = list({c["document_id"] for c in chunks})
    doc_map = {}
    if doc_ids:
        docs_result = (
            supabase.table("documents")
            .select("id, nome_original, tipo, tags")
            .eq("user_id", user["id"])
            .in_("id", doc_ids)
            .execute()
        )
        for d in (docs_result.data or []):
            doc_map[d["id"]] = d

    results = []
    for c in chunks:
        doc = doc_map.get(c["document_id"], {})
        results.append({
            "chunk_id": c["id"],
            "document_id": c["document_id"],
            "content": c["content"],
            "similarity": c.get("similarity", 0),
            "nome_original": doc.get("nome_original", ""),
            "tipo": doc.get("tipo", ""),
            "tags": doc.get("tags", []),
        })

    return {"results": results, "total": len(results)}


@router.put("/{doc_id}/tags")
async def update_document_tags(doc_id: str, body: dict, user: dict = Depends(get_current_user)):
    tags: List[str] = body.get("tags", [])

    supabase = _get_supabase()
    doc = (
        supabase.table("documents")
        .select("id")
        .eq("id", doc_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    supabase.table("documents").update({"tags": tags}).eq("id", doc_id).execute()

    return {"id": doc_id, "tags": tags}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    supabase = _get_supabase()
    doc = (
        supabase.table("documents")
        .select("id, storage_path")
        .eq("id", doc_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    storage_path = doc.data[0].get("storage_path")
    if storage_path:
        try:
            supabase.storage.from_("documents").remove([storage_path])
        except Exception as e:
            logger.warning(f"Falha ao remover arquivo do storage: {e}")

    supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user["id"]).execute()
    supabase.table("documents").delete().eq("id", doc_id).eq("user_id", user["id"]).execute()

    return {"status": "deleted", "id": doc_id}
