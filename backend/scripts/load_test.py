"""
Teste de carga — 100 uploads simultâneos de PDF

Uso:
    uv run python scripts/load_test.py --concurrency 10 --total 100

Requer:
    - Backend rodando em http://localhost:8000
    - Um PDF de teste em tests/fixtures/sample.pdf
    - Um token JWT válido (Bearer) exportado como JWT_TOKEN

O script mede:
    - Latência p50/p95/p99
    - Taxa de erro
    - Throughput (requisições/segundo)
"""

import argparse
import asyncio
import os
import statistics
import sys
import time
from datetime import datetime

import httpx

API_URL = os.getenv("API_URL", "http://localhost:8000")
JWT_TOKEN = os.getenv("JWT_TOKEN", "")


async def upload_pdf(client: httpx.AsyncClient, pdf_bytes: bytes, idx: int) -> dict:
    """Faz upload de um PDF e retorna métricas."""
    start = time.monotonic()
    try:
        files = {
            "file": (f"test_{idx}.pdf", pdf_bytes, "application/pdf"),
        }
        resp = await client.post(
            f"{API_URL}/api/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            timeout=60.0,
        )
        elapsed = time.monotonic() - start
        return {
            "index": idx,
            "status": resp.status_code,
            "elapsed": elapsed,
            "error": None if resp.is_success else resp.text[:200],
        }
    except Exception as e:
        elapsed = time.monotonic() - start
        return {
            "index": idx,
            "status": 0,
            "elapsed": elapsed,
            "error": str(e),
        }


async def run_worker(
    worker_id: int,
    semaphore: asyncio.Semaphore,
    pdf_bytes: bytes,
    total: int,
    results: list,
) -> None:
    """Worker que executa uploads em lote."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(worker_id, total, semaphore._value):
            async with semaphore:
                result = await upload_pdf(client, pdf_bytes, i)
                results.append(result)

                # Progresso
                done = len(results)
                if done % 10 == 0 or done == total:
                    elapsed_total = time.monotonic() - _start_time
                    rate = done / elapsed_total if elapsed_total > 0 else 0
                    print(
                        f"  [{datetime.now().strftime('%H:%M:%S')}] "
                        f"{done}/{total} — {rate:.1f} req/s",
                        flush=True,
                    )


async def main():
    parser = argparse.ArgumentParser(description="Teste de carga de upload de PDF")
    parser.add_argument("--concurrency", type=int, default=10, help="Concorrência simultânea")
    parser.add_argument("--total", type=int, default=100, help="Total de uploads")
    parser.add_argument("--pdf", type=str, default="tests/fixtures/sample.pdf", help="Caminho do PDF de teste")
    args = parser.parse_args()

    if not JWT_TOKEN:
        print("ERRO: Exporte JWT_TOKEN com um token Bearer válido")
        sys.exit(1)

    # Verifica PDF de teste
    pdf_path = os.path.join(os.path.dirname(__file__), "..", args.pdf)
    if not os.path.exists(pdf_path):
        print(f"ERRO: PDF de teste não encontrado em {pdf_path}")
        print("Crie um PDF simples e salve em tests/fixtures/sample.pdf")
        sys.exit(1)

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    print(f"\n{'='*60}")
    print(f"  Teste de Carga — Upload de PDF")
    print(f"  Concorrência: {args.concurrency}")
    print(f"  Total: {args.total}")
    print(f"  PDF: {args.pdf} ({len(pdf_bytes)} bytes)")
    print(f"{'='*60}\n")

    semaphore = asyncio.Semaphore(args.concurrency)
    results: list[dict] = []

    global _start_time
    _start_time = time.monotonic()

    # Dispara workers
    num_workers = min(args.concurrency, args.total)
    workers = [
        run_worker(i, semaphore, pdf_bytes, args.total, results)
        for i in range(num_workers)
    ]
    await asyncio.gather(*workers)

    total_time = time.monotonic() - _start_time

    # Estatísticas
    elapsed_list = [r["elapsed"] for r in results]
    errors = [r for r in results if r["error"] or r["status"] != 200]
    success = [r for r in results if r["status"] == 200]
    elapsed_sorted = sorted(elapsed_list)

    p50 = elapsed_sorted[len(elapsed_sorted) // 2] if elapsed_sorted else 0
    p95 = elapsed_sorted[int(len(elapsed_sorted) * 0.95)] if elapsed_sorted else 0
    p99 = elapsed_sorted[int(len(elapsed_sorted) * 0.99)] if elapsed_sorted else 0
    avg = statistics.mean(elapsed_list) if elapsed_list else 0
    throughput = args.total / total_time if total_time > 0 else 0

    print(f"\n{'='*60}")
    print(f"  RESULTADOS")
    print(f"{'='*60}")
    print(f"  Total:           {args.total}")
    print(f"  Sucesso:         {len(success)}")
    print(f"  Erros:           {len(errors)}")
    print(f"  Tempo total:     {total_time:.2f}s")
    print(f"  Throughput:      {throughput:.1f} req/s")
    print(f"  Média:           {avg:.3f}s")
    print(f"  P50:             {p50:.3f}s")
    print(f"  P95:             {p95:.3f}s")
    print(f"  P99:             {p99:.3f}s")
    print(f"{'='*60}\n")

    if errors:
        print("  Primeiros 5 erros:")
        for e in errors[:5]:
            print(f"    #{e['index']}: status={e['status']} erro={e['error']}")
        print()

    # Código de saída: 0 se OK, 1 se >5% de erro
    error_rate = len(errors) / args.total * 100 if args.total > 0 else 0
    sys.exit(1 if error_rate > 5 else 0)


if __name__ == "__main__":
    asyncio.run(main())
