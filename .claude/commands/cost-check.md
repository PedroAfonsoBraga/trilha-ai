Analise backend/app/services/ai_service.py e backend/app/services/rag_service.py.

Liste todas as chamadas à API Claude e Voyage sem modificar nenhum arquivo.

Para cada chamada, identifique:
1. O prompt caching está ativo? (cache_control: ephemeral)
2. O modelo usado é o mais adequado para a tarefa?
3. Há tokens desnecessários no system prompt?
4. Classifique cada issue como: CRÍTICO / IMPORTANTE / SUGESTÃO
