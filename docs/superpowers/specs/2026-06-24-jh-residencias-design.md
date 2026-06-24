# Spec — JH Residências (2026-06-24)

Sistema single-tenant de cobrança de aluguel: gera cobranças mensais, dispara via **WhatsApp Cloud API**,
recebe pagamentos via **Mercado Pago (Pix dinâmico)** e monitora pago/não-pago por **webhook**, com painel admin.

Stack: **Next.js (App Router) + Tailwind + Supabase (Postgres/Auth/RLS) + Vercel (deploy + Cron)**.

## 1. Decisões aprovadas
- Pagamento: **Mercado Pago — Pix dinâmico** (`POST /v1/payments`, `external_reference = charge_id`).
- WhatsApp: **Cloud API (Meta)** com templates aprovados.
- **Multa 2% + juros 1%/mês pró-rata die**, configurável por contrato.
- No atraso, lembretes **recalculam o total e geram novo Pix** com o valor atualizado.
- Notificações **B + C**: admin avisado (WhatsApp `admin_alerta`, fallback e-mail) em pagamento e inadimplência; inquilino recebe confirmação.
- Escala single-tenant, `owner_id` no schema para evolução futura.

## 2. Arquitetura (resumo)
Detalhe completo em [02-ARQUITETURA](../../02-ARQUITETURA.md), [03-SCHEMA](../../03-SCHEMA.md), [04-INTEGRACOES](../../04-INTEGRACOES.md).
- Camada `lib/` server-only: `mercadopago.ts`, `whatsapp.ts`, `charges.ts` (cálculo de juros), `notify.ts`, `supabase/server.ts`.
- Route handlers: `/api/webhooks/mercadopago`, `/api/webhooks/whatsapp`, `/api/cron/gerar-cobrancas`, `/api/cron/lembretes`.
- 7 tabelas: properties, tenants, leases, charges, payments, whatsapp_messages, webhook_events. RLS `owner_id = auth.uid()`.
- Idempotência de webhook por `webhook_events(source,event_id)`. Webhook MP **sempre reconsulta** `GET /v1/payments/{id}`.

## 3. Fluxos
- **A — Gerar+disparar:** cron mensal → cria charge → cria Pix MP → salva QR/link → envia template `cobranca_aluguel`.
- **B — Pago:** webhook MP (valida `x-signature`, idempotência, reconsulta) → charge `pago` + `payments` → `pagamento_confirmado` (inquilino) + `admin_alerta` (admin).
- **C — Atraso:** cron diário marca `vencido`, recalcula multa+juros, gera novo Pix, envia `lembrete_vencimento`; D+1/D+5; `admin_alerta`.

## 4. Cálculo de valor (regra central)
`valorDevido(charge, hoje)`:
- base = `lease.valor_centavos`
- se `hoje <= vencimento`: total = base
- se atrasado: `multa = base * multa_percent/100`; `juros = base * (juros_mes_percent/100) * (diasAtraso/30)`; total = base + multa + round(juros)
- valores em centavos (inteiro), arredondamento half-up. Coberto por testes unit.

## 5. Front — Design system "Ledger" (aprovado)
Referência visual: sidebar escura + conteúdo claro + verde + KPI sparklines + tabela com pills.

### Tokens
```
sidebar  #0E1A14   sidebar-text #9DB0A6   sidebar-active = brand sólido
brand    #149058   brand-dark #0E7A49     brand-tint #E5F4EC
canvas   #F3F5F1   surface #FFFFFF
ink      #142019   muted #677570          faint #9AA5A0   border #ECEEEA
pago     brand     pendente #A06A0E / tint #FBF1DC
vencido  #C0392B / tint #FBEAE7
fontes   UI: Plus Jakarta Sans (400/500/600/700)
         valores R$: IBM Plex Mono, font-feature 'tnum' (algarismos tabulares)
raio     pill 999 · card 16 · shell 18   |  borda 1px hairline
sinais   sparkline nos KPIs, barra "recebido %", "+Nd" e juros em vermelho
```

### Componentes
- `AppShell` — sidebar (desktop, recolhível) ⇄ bottom-tab + FAB central (mobile).
- `MetricCard` — ícone-chip + label + valor mono + sparkline/barra.
- `StatusPill` — pago/pendente/vencido (tints sóbrios).
- `ChargesTable` (desktop) / `ChargeCard` (mobile) — avatar, imóvel, vencimento c/ atraso, valor + juros, menu de ações.
- `MonthSelector`, `FilterTabs`, `PrimaryButton`, `EmptyState`.

### Responsivo
- Breakpoints alvo: 360 / 768 / 1024 / 1440.
- Desktop: sidebar fixa 212px + main fluido. Mobile: header verde-herói (recebido + progresso), KPIs em par, cobranças como cards, bottom-tab.

## 6. Telas (MVP)
1. **Login** (Supabase Auth, só admin).
2. **Visão geral** — KPIs + cobranças recentes.
3. **Cobranças** — lista filtrável (todas/pendentes/vencidas), detalhe com QR Pix + histórico de mensagens + reenviar.
4. **Inquilinos** — CRUD + dados de contrato.
5. **Imóveis** — CRUD.
6. **Configurações** — credenciais/integrações, multa/juros padrão, número admin.

## 7. Erros & segurança
- Falha de WhatsApp não bloqueia confirmação de pagamento (loga em `whatsapp_messages.erro`).
- Cron protegido por `CRON_SECRET`; geração idempotente via `unique(lease_id, competencia)`.
- Webhook WhatsApp valida `X-Hub-Signature-256`; MP valida `x-signature`.
- Secrets só server. RLS em todas as tabelas. LGPD: dados pessoais mínimos.

## 8. Testes
- Unit: `valorDevido` (vários cenários de atraso), validação de assinatura de webhook.
- Integração: handlers de webhook com fixtures MP/WhatsApp; geração de cobranças idempotente.
- E2E: login → cadastro → gerar cobrança → (mock) pagar → painel `pago` + alerta admin.
- Alvo de cobertura: 80%+ na `lib/`.

## 9. Roadmap de execução
Fases conforme [05-ROADMAP](../../05-ROADMAP.md): 0 Setup → 1 Banco/Cadastros → 2 Cobrança+MP → 3 WhatsApp → 4 Webhook pagamento → 5 Painel.
Pós-MVP: reajuste IGPM/IPCA, recibos PDF, multi-tenant, portal do inquilino.
