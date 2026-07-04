"""
Verifica se é seguro fazer cutover para Voyage 4.

Uso:
    cd backend && uv run python scripts/check_voyage4_cutover.py

Critérios de segurança:
    1. Não deve existir nenhum chunk com embedding_model='voyage-3'.
    2. Todos os documentos com chunks devem ter embedding_model='voyage-4-large'.

Se este script reportar 0 chunks voyage-3, é seguro alterar
EMBEDDING_MODEL_VERSION=voyage-4 no .env e reiniciar o backend.
"""

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[ERRO] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios")
    sys.exit(1)


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    result = (
        supabase.table("document_chunks")
        .select("embedding_model", count="exact")
        .eq("embedding_model", "voyage-3")
        .execute()
    )
    voyage3_count = result.count if result.count is not None else 0

    result_total = (
        supabase.table("document_chunks")
        .select("embedding_model", count="exact")
        .execute()
    )
    total = result_total.count if result_total.count is not None else 0

    result_models = (
        supabase.table("document_chunks")
        .select("embedding_model")
        .execute()
    )
    models = {}
    for row in (result_models.data or []):
        m = row.get("embedding_model") or "unknown"
        models[m] = models.get(m, 0) + 1

    print(f"Total de chunks: {total}")
    print("Distribuição por embedding_model:")
    for model, count in sorted(models.items()):
        print(f"  - {model}: {count}")

    if voyage3_count == 0 and total > 0:
        print("\n[OK] Cutover seguro: nenhum chunk em voyage-3.")
        print("     Altere EMBEDDING_MODEL_VERSION=voyage-4 no .env e reinicie o backend.")
        sys.exit(0)
    elif total == 0:
        print("\n[AVISO] Nenhum chunk encontrado. Nada a migrar.")
        sys.exit(0)
    else:
        print(f"\n[ATENÇÃO] Ainda existem {voyage3_count} chunk(s) em voyage-3.")
        print("     NÃO altere EMBEDDING_MODEL_VERSION para voyage-4 ainda.")
        print("     Rode scripts/reindex_voyage4.py até que este script reporte OK.")
        sys.exit(1)


if __name__ == "__main__":
    main()
