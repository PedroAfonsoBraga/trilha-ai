# Sprint 9 — Polimento + Observabilidade
**Semanas 25–26 · Fase 3 · GATE PARA ADS PAGOS**

## Objetivo
Endurecer o produto para escala e ativar aquisição paga.

## Entregas
- [ ] Monitoramento de custo de IA por usuário/plano (dashboard interno)
- [ ] Testes de carga: 100 uploads simultâneos
- [ ] Cache agressivo de outputs repetidos
- [ ] LGPD: endpoint de exclusão de dados do usuário
- [ ] Alertas de custo (Sentry/Posthog)
- [ ] Revisão geral de RLS e segurança

## Gate de saída
✅ 80 pagantes ativos ANTES de ativar CAC pago.
✅ Sistema aguenta 100 uploads simultâneos sem degradar.
✅ Custo por usuário dentro do projetado (~R$3,20 variável).

## Condições para ativar ads (do GTM)
- Churn < 10% por 2 meses consecutivos
- NPS ≥ 40 (mín. 30 respondentes)
- LTV/CAC ≥ 3x
- Caixa para 3 meses de burn

## Riscos
- Não ativar ads sem TODAS as condições atendidas — é regra do plano financeiro
