# Sprint 4 — RAG + Chat
**Semanas 10–12 · Fase 2**

## Objetivo
Adicionar busca semântica e chat com documentos.

## Entregas
- [ ] Pipeline de embeddings (Voyage-3-lite)
- [ ] Chunking de documentos + armazenamento em pgvector
- [ ] Busca por similaridade cosseno + reranking
- [ ] Chat com streaming SSE
- [ ] Multi-documento (até 3 simultâneos)
- [ ] Index ivfflat otimizado no pgvector

## Gate de saída
✅ Acerto > 75% nas perguntas de validação.
✅ Custo < R$0,05 por conversa.

## Fora de escopo
TCC Assistant, revisão espaçada.

## Riscos
- Qualidade do chunking afeta tudo — testar estratégias (fixo vs semântico)
- Custo pode escapar sem prompt caching — usar /cost-check sempre
- pgvector com lists=100 pode precisar tuning conforme volume
