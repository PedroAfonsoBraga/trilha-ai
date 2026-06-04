# Sprint 2 — Anki + Onboarding + Viral
**Semanas 5–6 · Fase 1 (MVP) · ÚLTIMO SPRINT DO MVP**

## Objetivo
Fechar o MVP: flashcards exportáveis, onboarding por perfil,
loop viral e lançamento para a waitlist.

## Entregas
- [ ] Geração de flashcards via Claude (frente/verso + tags)
- [ ] Export .apkg via genanki (anki_service)
- [ ] Onboarding: 3 perguntas (concurseiro/universitário/mestrando)
- [ ] Interface adaptada ao perfil
- [ ] Compartilhamento: URL pública por output
- [ ] Rodapé "Gerado com Trilha" nos arquivos exportados
- [ ] Marca d'água nos outputs do plano Free
- [ ] Rate limiting completo por plano (todas as features)
- [ ] Afiliação contextual Amazon (sugestão de livro por tema)
- [ ] Testes E2E Playwright: auth, upload, pagamento
- [ ] Landing page de marketing

## Gate de saída
✅ .apkg importa no Anki sem erro, com revisão espaçada configurada.
✅ 50 usuários da waitlist com acesso ativo.
✅ Loop viral funcionando: output compartilhável gera cadastro.

## Fora de escopo
RAG, chat, TCC, motor SM-2 completo (só estrutura do flashcard).

## Riscos
- genanki tem peculiaridades no formato — testar import real cedo
- Afiliação Amazon exige conta no programa de afiliados (aprovação)
