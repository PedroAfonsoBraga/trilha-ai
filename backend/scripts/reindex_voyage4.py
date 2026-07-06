"""
Script de migração batch: re-indexa todos os documentos com voyage-4-large.

Uso:
    cd backend && uv run python scripts/reindex_voyage4.py

Pré-requisitos:
    - Migration 016 aplicada (coluna embedding_model em document_chunks)
    - Variável EMBEDDING_MODEL_VERSION configurada como 'voyage-4' no .env
      (o script força esse valor internamente para evitar acidentes)
    - VOYAGE_API_KEY configurada

O script:
    1. Itera sobre todos os documentos do banco (paginado).
    2. Para cada documento, gera chunks com chunking_service.
    3. Gera embeddings com voyage-4-large.
    4. Substitui chunks antigos no document_chunks.
    5. Atualiza o cache por hash para reuso futuro.

É idempotente: rodar várias vezes substitui os chunks pelos mesmos vetores.
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[ERRO] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios")
    sys.exit(1)

# Força o modo voyage-4 para garantir que este script sempre use voyage-4-large.
os.environ["EMBEDDING_MODEL_VERSION"] = "voyage-4"

from supabase import create_client

from app.services import chunking_service, embedding_service, pdf_cache_service


def _get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _chunks_to_cache_jsonb(chunks, embeddings):
    result = []
    for i, chunk in enumerate(chunks):
        item = {
            "chunk_index": chunk.index,
            "content": chunk.content,
            "token_count": chunk.token_count,
            "section": chunk.section,
        }
        if i < len(embeddings):
            item["embedding"] = embeddings[i]
        result.append(item)
    return result


async def reindex_document(supabase, doc: dict) -> dict:
    doc_id = doc["id"]
    user_id = doc["user_id"]
    metadata = doc.get("metadata") or {}
    file_hash = metadata.get("file_hash")

    # Prefere Markdown estruturado, fallback para texto puro
    texto = (
        metadata.get("markdown_text")
        or doc.get("markdown_text")
        or doc.get("texto_extraido")
    )
    if not texto:
        return {"doc_id": doc_id, "status": "skipped", "reason": "sem texto extraído"}

    doc_type = doc.get("tipo", "pdf_generico")
    chunks = chunking_service.chunk_by_type(texto, doc_type)
    if not chunks:
        return {"doc_id": doc_id, "status": "skipped", "reason": "não gerou chunks"}

    embedding_model = embedding_service.get_doc_model()
    texts = [c.content for c in chunks]

    # Tenta reaproveitar cache de chunks já em voyage-4-large
    cached_chunks = None
    if file_hash:
        cached = pdf_cache_service.get_cached_document(file_hash, embedding_model)
        cached_chunks = cached.get("chunks_jsonb") if cached else None

    if cached_chunks and all(c.get("embedding") for c in cached_chunks):
        embeddings = [c["embedding"] for c in cached_chunks]
        print(f"  -> usando cache de chunks voyage-4-large")
    else:
        embeddings = await embedding_service.gerar_embeddings_batch(
            texts, input_type="document", model=embedding_model
        )

    # Substitui chunks antigos atomicamente (delete + insert)
    supabase.table("document_chunks").delete().eq("document_id", doc_id).eq("user_id", user_id).execute()

    for i, chunk in enumerate(chunks):
        if i >= len(embeddings):
            continue
        supabase.table("document_chunks").insert({
            "document_id": doc_id,
            "user_id": user_id,
            "chunk_index": chunk.index,
            "content": chunk.content,
            "section": chunk.section,
            "token_count": chunk.token_count,
            "embedding": embeddings[i],
            "embedding_model": embedding_model,
        }).execute()

    # Atualiza cache por hash para reuso futuro
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

    return {"doc_id": doc_id, "status": "ok", "chunks": len(chunks)}


async def main():
    supabase = _get_supabase()

    # Valida que estamos realmente em voyage-4
    if embedding_service.get_doc_model() != "voyage-4-large":
        print("[ERRO] get_doc_model() não retornou voyage-4-large. Verifique EMBEDDING_MODEL_VERSION.")
        sys.exit(1)

    print(f"[INÍCIO] Re-indexação com {embedding_service.get_doc_model()}")

    page = 0
    page_size = 50
    total_ok = 0
    total_skipped = 0
    total_error = 0

    while True:
        result = (
            supabase.table("documents")
            .select("id, user_id, tipo, texto_extraido, markdown_text, metadata")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        docs = result.data or []
        if not docs:
            break

        print(f"[PÁGINA {page + 1}] {len(docs)} documentos")

        for doc in docs:
            try:
                res = await reindex_document(supabase, doc)
                if res["status"] == "ok":
                    total_ok += 1
                    print(f"  [OK] {res['doc_id']}: {res['chunks']} chunks")
                else:
                    total_skipped += 1
                    print(f"  [SKIP] {res['doc_id']}: {res['reason']}")
            except Exception as e:
                total_error += 1
                print(f"  [ERROR] {doc['id']}: {e}")

        page += 1

    print(f"\n[RESUMO] ok={total_ok}, skipped={total_skipped}, erros={total_error}")

    if total_error == 0:
        print("[PRÓXIMO PASSO] Verifique que não há chunks com embedding_model='voyage-3' antes de fazer cutover.")
    else:
        print("[ATENÇÃO] Corrija os erros antes do cutover.")


if __name__ == "__main__":
    asyncio.run(main())
