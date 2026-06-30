# JH Residências — Contrato de Implementação (Fundação)

> Documento-mapa que os demais agentes seguem. Lista as assinaturas exatas dos
> clients Supabase, os tipos `Db*`, as classes CSS compartilhadas, as rotas de
> navegação e as convenções. **Não reescreva** o que está aqui — apenas importe/use.

## Convenções gerais

- Valores monetários: **centavos** (`integer`). Só viram string na borda de exibição (`src/lib/money.ts`).
- Datas: ISO `YYYY-MM-DD` (date) e ISO 8601 (timestamptz). Helpers em `src/lib/dates.ts`.
- Telefone: E.164 (`+5511999998888`).
- Identificadores de tabela em inglês (`charge`/`lease`/`tenant`/`property`); UI em pt-BR.
- TypeScript strict: sem `any` solto; erros tratados explicitamente; sem `console.log` de debug.
- Server-only: `'use client'` NUNCA importa `src/lib/supabase/server.ts` nem `serverEnv()`.

## Banco de dados

Migrations em `supabase/migrations/`:

- `0001_init.sql` — tabelas, índices, RLS e policies (`owner_id = auth.uid()`).
- `0002_seed.sql` — seed de DEV (substituir o `owner_id` placeholder antes de rodar).

Tabelas: `properties`, `tenants`, `leases`, `charges`, `payments`, `whatsapp_messages`, `webhook_events`.

Restrições-chave:

- `charges`: `unique (lease_id, competencia)`.
- `webhook_events`: `unique (source, event_id)`; RLS sem policy de usuário (só service_role).
- RLS habilitado em todas as tabelas de negócio.

## Tipos de linha do banco — `src/lib/db-types.ts`

Shape exato do Postgres (snake_case). Mapeie para os tipos de UI de `src/lib/types.ts` na borda.

```ts
type ChargeStatusDb = "pendente" | "pago" | "vencido" | "cancelado";
type PropertyTipoDb = "apartamento" | "casa" | "comercial";
type WebhookSourceDb = "mercadopago" | "whatsapp";
type WhatsappStatusDb = "enviado" | "entregue" | "lido" | "falhou";

interface DbProperty        { id; owner_id; nome; endereco; tipo: PropertyTipoDb; created_at; }
interface DbTenant          { id; owner_id; nome; telefone; email: string|null; cpf: string|null; created_at; }
interface DbLease           { id; owner_id; property_id; tenant_id; valor_centavos; dia_vencimento;
                              inicio; fim: string|null; multa_percent; juros_mes_percent; ativo; created_at; }
interface DbCharge          { id; owner_id; lease_id; competencia; valor_centavos; vencimento;
                              status: ChargeStatusDb; mp_payment_id; mp_preference_id; pix_copia_cola;
                              link_pagamento; pago_em; created_at; }
interface DbPayment         { id; owner_id; charge_id; mp_payment_id; status; valor_centavos; metodo; raw; created_at; }
interface DbWhatsappMessage { id; owner_id; charge_id: string|null; tenant_id; template; wamid: string|null;
                              status: WhatsappStatusDb; erro: string|null; created_at; }
interface DbWebhookEvent    { id; source: WebhookSourceDb; event_id; payload; processed_at: string|null; created_at; }
```

(`id`/`owner_id`/`*_id`/`created_at` são `string`; `*_centavos`/`dia_vencimento` são `number`; `raw`/`payload` são `unknown`.)

## Env validado — `src/lib/env.ts`

Validação **lazy** (zod), só roda em runtime na 1ª chamada. `next build` não quebra sem secrets.

```ts
type ServerEnv; // MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
                // WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL
type PublicEnv; // NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

function serverEnv(): ServerEnv; // server-only; lança erro se faltar var
function publicEnv(): PublicEnv;
```

## Clients Supabase

### `src/lib/supabase/server.ts` (`import "server-only"`)

```ts
function createServiceClient(): SupabaseClient;                 // service role, IGNORA RLS (cron/webhooks/repos)
async function createServerClient(): Promise<SupabaseClient>;   // SSR + cookies, RESPEITA RLS (painel autenticado)
```

### `src/lib/supabase/client.ts` (`'use client'`)

```ts
function createBrowserClient(): SupabaseClient;                 // anon key, RESPEITA RLS
```

### `src/lib/supabase/middleware.ts`

```ts
async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: { id: string } | null }>;
```

Usado pelo `middleware.ts` da raiz (guard de sessão do painel; redireciona p/ `/login` sem sessão).
`/login` e `/api/*` ficam fora do guard.

## Cron — `vercel.json`

- `/api/cron/gerar-cobrancas` → `0 9 1 * *`
- `/api/cron/lembretes` → `0 9 * * *`

Cada handler valida `Authorization: Bearer $CRON_SECRET`.

## Classes CSS compartilhadas — `src/app/globals.css`

Use estas classes (tokens `--color-*` já definidos):

| Classe | Uso |
|--------|-----|
| `.card-surface` | superfície de cartão (fundo + borda + raio) |
| `.label` | rótulo de campo de formulário |
| `.field` | base de `input` / `select` / `textarea` (com `:focus`/`:disabled`) |
| `.btn-ghost` | botão secundário (fantasma) |
| `.table-base` | tabela (estiliza `thead th` / `tbody td` / hover) |
| `.badge` + `.badge-pago` / `.badge-pendente` / `.badge-vencido` / `.badge-cancelado` | badge de status |
| `.tnum` | algarismos tabulares para valores monetários (pré-existente) |

## Navegação (Sidebar)

Ordem dos itens: **Visão geral** (`/painel`) · **Cobranças** (`/cobrancas`) · **Inquilinos** (`/inquilinos`) · **Contratos** (`/contratos`) · **Imóveis** (`/imoveis`) · **Configurações** (`/configuracoes`).

> Rota nova adicionada pela Fundação: **`/contratos`** (entre Inquilinos e Imóveis).
