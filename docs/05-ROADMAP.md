# JH Residências — Roadmap / Task List

Estimativa total do MVP: ~5 fases. Cada fase é entregável e testável isoladamente.

## Fase 0 — Setup (fundação)
- [ ] Criar projeto Next.js (App Router) + Tailwind.
- [ ] Criar projeto Supabase; configurar Auth (e-mail/senha só p/ o admin).
- [ ] Configurar clients Supabase: `lib/supabase/server.ts` (service role) e `client.ts` (anon).
- [ ] `.env.example` com todas as variáveis do doc de arquitetura.
- [ ] Deploy inicial na Vercel (placeholder) + env vars.

## Fase 1 — Banco e cadastros
- [ ] Migration: `properties`, `tenants`, `leases`, `charges`, `payments`, `whatsapp_messages`, `webhook_events`.
- [ ] Habilitar RLS + policies `owner_id = auth.uid()`.
- [ ] Constraint `unique(lease_id, competencia)` em `charges`.
- [ ] CRUD de imóveis (lista + form).
- [ ] CRUD de inquilinos (lista + form, telefone E.164 validado).
- [ ] CRUD de contratos (vincula imóvel + inquilino + valor + dia de vencimento).

## Fase 2 — Geração de cobranças + Mercado Pago
- [ ] `lib/mercadopago.ts`: criar cobrança Pix, consultar pagamento.
- [ ] `lib/charges.ts`: gerar charges do mês a partir de contratos ativos (idempotente).
- [ ] `POST /api/cron/gerar-cobrancas` protegido por `CRON_SECRET`.
- [ ] Botão "gerar cobrança avulsa" no painel.
- [ ] Tela de detalhe da cobrança com QR Pix + link.

## Fase 3 — WhatsApp
- [ ] Submeter templates `cobranca_aluguel`, `lembrete_vencimento`, `pagamento_confirmado` à Meta.
- [ ] `lib/whatsapp.ts`: enviar template, registrar `wamid`.
- [ ] Disparar template ao gerar cobrança.
- [ ] `POST /api/cron/lembretes`: D-3 / D0 / D+1 / D+5 + marcar vencidas.
- [ ] `GET/POST /api/webhooks/whatsapp`: verificação + status de entrega.
- [ ] Botão "reenviar cobrança" no painel.

## Fase 4 — Webhook de pagamento (monitoramento)
- [ ] `POST /api/webhooks/mercadopago`: validar `x-signature`, idempotência, reconsultar pagamento.
- [ ] Atualizar `charge` → `pago`, inserir `payment`.
- [ ] (Opcional) enviar `pagamento_confirmado` no WhatsApp.
- [ ] Testar com sandbox/Pix de teste do MP.

## Fase 5 — Painel administrativo
- [ ] Dashboard: KPIs do mês (a receber, recebido, pendente, inadimplência %).
- [ ] Lista de cobranças filtrável por status/competência.
- [ ] Histórico de mensagens por inquilino.
- [ ] Indicador de cobranças vencidas em destaque.

## Pós-MVP (fase 2 do produto)
- [ ] Reajuste anual (IGPM/IPCA).
- [ ] Multa + juros por atraso automáticos.
- [ ] Recibos em PDF.
- [ ] Multi-usuário / multi-imobiliária (já há `owner_id`).
- [ ] Portal do inquilino (2ª via, histórico).

## Estratégia de testes
- Unit: `lib/charges.ts` (geração idempotente, cálculo de vencido), validação de assinatura de webhook.
- Integração: handlers de webhook com payloads-fixture do MP e WhatsApp.
- E2E: fluxo cadastro → gerar cobrança → (mock) pagar → painel mostra pago.
- Cobertura alvo: 80%+ na camada `lib/`.
