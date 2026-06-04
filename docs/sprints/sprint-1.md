# Sprint 1 — Concurso Assistant + PDF
**Semanas 3–4 · Fase 1 (MVP)**

## Objetivo
Primeira feature de valor real: transformar edital em cronograma
e PDF em fichamento ABNT.

## Entregas
- [ ] Upload de PDF → Supabase Storage (bucket documents)
- [ ] Extração de texto: PyMuPDF (nativo) + Tesseract (OCR fallback)
- [ ] Parser de edital — detecção de banca (CESPE/FCC/Vunesp)
- [ ] Extração: datas, disciplinas, pesos
- [ ] Cronograma semanal por peso de disciplina
- [ ] Export .ics (Google Calendar) via ics_service
- [ ] Export checklist PDF
- [ ] Fichamento ABNT → .docx (python-docx)
- [ ] Tela de upload + resultado no frontend
- [ ] Rate limiting: 3 editais e 5 PDFs no Free

## Gate de saída
✅ 3 editais reais validados manualmente (1 CESPE, 1 FCC, 1 Vunesp).
✅ .ics importa no Google Calendar sem erro.
✅ .docx abre no Word com formatação ABNT correta.

## Fora de escopo
Flashcards, chat, RAG, revisão espaçada.

## Riscos
- Editais têm layouts muito diferentes — parser precisa de fallback robusto
- OCR de editais escaneados pode ser lento — processar via job assíncrono
- Custo de IA: usar prompt caching no texto do edital
