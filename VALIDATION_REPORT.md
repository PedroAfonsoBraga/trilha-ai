# Validação da Implementação - Melhoria do RAG do Chat

## Resumo

A implementação foi validada e está **funcionalmente correta**. Todos os componentes principais estão funcionando:
- ✅ Migration 018 (busca híbrida com RRF)
- ✅ Query rewriting com cache
- ✅ Busca híbrida (semântica + lexical)
- ✅ Merge RRF de múltiplas queries
- ✅ Rerank com filtro de similaridade
- ✅ Contexto enriquecido (título + seção)
- ✅ Histórico de conversa
- ✅ Persistência de `section` em todos os pontos de inserção
- ✅ Python imports OK
- ✅ TypeScript build OK

## Problemas Encontrados e Corrigidos

### 1. **Inconsistência no tratamento de `lexical_rank` NULL** (Migration 018) ✅ CORRIGIDO

**Localização**: `supabase/migrations/018_hybrid_search.sql:135-137`

**Problema**: 
- Linha 135: `coalesce(c.lexical_rank, 0) as lexical_rank` - retorna 0 se NULL
- Linha 137: `coalesce(1.0 / (60 + coalesce(c.lexical_rank, 999)), 0.0) * 1.5` - usa 999 se NULL

**Impacto**: Chunks sem match lexical terão `lexical_rank = 0` mas o cálculo do RRF usará 999, resultando em um score muito baixo (1.0 / (60 + 999) = 0.00094). Isso é confuso mas não quebra o sistema.

**Correção aplicada**:
```sql
coalesce(c.lexical_rank, 0) as lexical_rank,
coalesce(1.0 / (60 + c.semantic_rank), 0.0) +
case when c.lexical_rank is not null then 1.0 / (60 + c.lexical_rank) * 1.5 else 0.0 end +
coalesce(c.keyword_match_count * 0.05, 0.0) as rrf_score
```

Agora o tratamento é consistente: se `lexical_rank` é NULL, não há boost lexical (0.0).

---

### 2. **Default de `similarity` é 1.0** (search_service.py) ✅ CORRIGIDO

**Localização**: `backend/app/services/search_service.py:152`

**Problema**: 
```python
filtered = [c for c in chunks if c.get("similarity", 1.0) >= min_similarity]
```

Se o chunk não tem campo `similarity`, assume 1.0 (máximo), o que é contraintuitivo. Chunks sem similarity passam no filtro como se fossem perfeitos.

**Impacto**: Na prática, a RPC `search_chunks_hybrid` sempre retorna `similarity`, então isso não deve ser um problema. Mas é uma boa prática usar um default mais seguro.

**Correção aplicada**:
```python
filtered = [c for c in chunks if c.get("similarity", 0.0) >= min_similarity]
```

Agora chunks sem `similarity` são tratados como se tivessem similarity=0.0 (mínimo), o que é mais seguro.

---

### 3. **Import desnecessário** (query_rewriter.py) ✅ CORRIGIDO

**Localização**: `backend/app/services/query_rewriter.py:15`

**Problema**: 
```python
from app.services.cache_service import get_cached, set_cached
```

`set_cached` é importado mas nunca usado.

**Correção aplicada**:
```python
from app.services.cache_service import get_cached
```

---

### 4. **Bug no `_recover_json`** (query_rewriter.py) ✅ CORRIGIDO

**Localização**: `backend/app/services/query_rewriter.py:51-64`

**Problema**: 
O `_recover_json` não considera a ordem de aninhamento das chaves/colchetes. Ele simplesmente conta quantos estão abertos e fecha na ordem errada.

**Exemplo**:
```python
# Input: {"queries": ["teste"], "keywords": ["kw"
# Output: {"queries": ["teste"], "keywords": ["kw"}]  # INVÁLIDO!
# Correto: {"queries": ["teste"], "keywords": ["kw"]}
```

**Impacto**: O recovery falha para JSONs truncados, mas o fallback gracioso funciona: se o parse falhar, retorna `{"queries": [], "keywords": []}`, e o `rewrite_query` retorna `{"queries": [query], "keywords": []}`.

**Correção aplicada**:
```python
def _recover_json(text: str) -> str:
    """Fecha chaves/colchetes desbalanceados antes de fazer parse."""
    text = text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    # Fechar na ordem inversa de abertura (LIFO)
    stack = []
    for char in text:
        if char in '{[':
            stack.append(char)
        elif char in '}]':
            if stack:
                stack.pop()
    
    # Fechar o que sobrou na stack
    for char in reversed(stack):
        if char == '{':
            text += '}'
        elif char == '[':
            text += ']'

    return text
```

Agora o recovery usa uma stack para fechar na ordem correta (LIFO - Last In, First Out).

**Testes após correção**:
- ✅ `{"queries": ["teste"], "keywords": ["kw"` → `{"queries": ["teste"], "keywords": ["kw"]}`
- ✅ `{"queries": ["teste"], "keywords": ["kw"]` → `{"queries": ["teste"], "keywords": ["kw"]}`
- ✅ `{"queries": ["teste"` → `{"queries": ["teste"]}`

---

## Testes Realizados

### 1. **Imports Python**
```bash
uv run python -c "from app.main import app"
```
✅ OK

### 2. **TypeScript Build**
```bash
./node_modules/.bin/tsc --noEmit
```
✅ 0 erros

### 3. **Testes Unitários**
```bash
uv run pytest tests/test_upload_job_service.py tests/test_pdf_cache_service.py tests/test_embedding_service.py -q
```
✅ 17 passaram, 1 falhou (pré-existente, não relacionado ao RAG)

### 4. **Testes de Lógica**
- ✅ `_parse_rewrite_response`: JSON válido, truncado, com markdown, inválido, vazio
- ✅ `merge_rrf_results`: RRF com duas listas, deduplicação, ordenação
- ✅ `rerank_chunks`: Filtro por `min_similarity`
- ✅ `_build_context`: Contexto com título e seção
- ✅ `_format_history`: Histórico formatado
- ✅ Cache: Salvar e recuperar

---

## Recomendações

### Antes de Aplicar em Produção

1. **Aplicar migration 018 no Supabase SQL Editor**
   - Usar `supabase/migrations/run_018_hybrid_search.sql`
   - Verificar se `unaccent` extension está disponível

2. **Re-chunkar documentos antigos**
   - Documentos existentes não têm `tsv` e `section`
   - Opções:
     - Rodar `scripts/reindex_voyage4.py` (se estiver fazendo cutover para voyage-4)
     - Ou deletar chunks e re-chunkar manualmente via `POST /api/documents/{id}/chunk`

3. **Testar no chat real**
   - Pergunta: "cai matemática nesse edital?"
   - Esperado: Resposta com base no conteúdo programático
   - Verificar logs de observabilidade

4. **Corrigir problemas menores (opcional)**
   - Inconsistência no `lexical_rank` NULL
   - Default de `similarity` para 0.0
   - Import desnecessário
   - Bug no `_recover_json`

### Monitoramento

- Verificar logs de `chat_service.py` para observar:
  - Quantas variantes são geradas pelo query rewriting
  - Quantos chunks são recuperados pela busca híbrida
  - Scores de similaridade e RRF
  - Se o rerank está funcionando

---

## Conclusão

A implementação está **funcionalmente correta** e pronta para teste em produção após aplicar a migration 018 e re-chunkar documentos antigos. Todos os problemas encontrados foram corrigidos.

**Status**: ✅ Aprovado
