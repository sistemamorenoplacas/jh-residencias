# JH Residências — Arquitetura

## Visão de alto nível

```
                         ┌──────────────────────────────┐
                         │   Painel Admin (Next.js)      │
                         │  /dashboard /imoveis /inquilinos
                         │  /cobrancas  (Supabase Auth)  │
                         └───────────────┬──────────────┘
                                         │ server actions / route handlers
                                         ▼
┌──────────────┐   cron     ┌──────────────────────────────┐    ┌──────────────────┐
│ Vercel Cron  │──────────► │   Next.js API (server-only)   │───►│  Mercado Pago API │
│ (mensal/diário)            │  - gera cobranças            │    │  (cria Pix/link)  │
└──────────────┘            │  - dispara WhatsApp           │    └────────┬─────────┘
                            │  - processa webhooks          │             │ webhook
        ┌───────────────────┤                               │◄────────────┘ pagamento
        │ webhook status     │                               │
        ▼                    └───────────────┬──────────────┘
┌──────────────────┐                         │ service role
│ WhatsApp Cloud   │◄────── envia template ──┤
│ API (Meta)       │                         ▼
└──────────────────┘              ┌────────────────────────┐
                                  │  Supabase (Postgres)    │
                                  │  RLS + tabelas + logs   │
                                  └────────────────────────┘
```

## Componentes

### 1. Frontend / Painel (Next.js App Router)
- Rotas protegidas por Supabase Auth (apenas o admin loga).
- Server Components para leitura; Server Actions para mutações.
- UI com Tailwind. Telas: Dashboard, Imóveis, Inquilinos, Cobranças, Detalhe da cobrança.

### 2. Camada de serviço (server-only)
- `lib/mercadopago.ts` — cria cobrança Pix/boleto, consulta pagamento.
- `lib/whatsapp.ts` — envia template via Graph API.
- `lib/charges.ts` — regra de geração de cobranças e cálculo de status (pendente/vencido).
- `lib/supabase/server.ts` — client com **service role** (nunca exposto ao browser).

### 3. Route handlers (API)
- `POST /api/webhooks/mercadopago` — recebe notificação de pagamento, valida `x-signature`, idempotência por `event_id`, atualiza charge.
- `GET/POST /api/webhooks/whatsapp` — `GET` verifica `hub.verify_token`; `POST` recebe status (sent/delivered/read/failed) e mensagens recebidas.
- `POST /api/cron/gerar-cobrancas` — protegido por `CRON_SECRET`, gera cobranças do mês.
- `POST /api/cron/lembretes` — protegido por `CRON_SECRET`, dispara lembretes D-3/D0/D+1/D+5.

### 4. Jobs agendados (Vercel Cron)
- `0 9 1 * *` → gera cobranças do mês (dia 1, 09:00).
- `0 9 * * *` → roda lembretes diários e marca vencidas.

### 5. Banco (Supabase)
- Postgres com RLS. Ver `03-SCHEMA.md`.
- `webhook_events` para idempotência.
- Logs de mensagens WhatsApp e pagamentos para auditoria.

## Fluxos principais

### Fluxo A — Geração + disparo da cobrança
1. Cron mensal chama `/api/cron/gerar-cobrancas`.
2. Para cada contrato ativo, cria `charge` (status `pendente`).
3. Cria cobrança no Mercado Pago → recebe `payment_id`, link e QR Pix.
4. Salva dados de pagamento na `charge`.
5. Envia template no WhatsApp com valor, vencimento e link.
6. Registra envio em `whatsapp_messages`.

### Fluxo B — Pagamento confirmado
1. Inquilino paga via Pix/link.
2. Mercado Pago chama `POST /api/webhooks/mercadopago`.
3. Valida assinatura + idempotência (`webhook_events`).
4. Consulta o pagamento na API do MP (fonte da verdade) → status `approved`.
5. Atualiza `charge` para `pago`, grava em `payments`.
6. (Opcional) envia confirmação no WhatsApp.

### Fluxo C — Inadimplência
1. Cron diário marca como `vencido` toda charge `pendente` com `vencimento < hoje`.
2. Dispara lembrete de atraso (D+1, D+5).
3. Painel recalcula KPIs de inadimplência.

## Segurança
- Secrets só no server (env vars Vercel). Service role nunca no client.
- Webhook MP: validar `x-signature` + `x-request-id` e **sempre reconsultar** o pagamento na API antes de confirmar.
- Webhook WhatsApp: validar `X-Hub-Signature-256` (HMAC com app secret).
- Cron endpoints: header `Authorization: Bearer $CRON_SECRET`.
- RLS em todas as tabelas; acesso de escrita via service role apenas no backend.
- LGPD: dados pessoais mínimos, sem expor CPF no client.

## Variáveis de ambiente (`.env.local` / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
CRON_SECRET=
APP_BASE_URL=
```
