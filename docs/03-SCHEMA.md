# JH Residências — Modelo de Dados (Supabase / Postgres)

> Datas em ISO-8601. Telefone em E.164 (`+5511999998888`). Valores em centavos (`integer`) para evitar erro de float.
> `owner_id` presente desde já (aponta para `auth.users`) para permitir multi-tenant futuro sem migração destrutiva.

## Diagrama de entidades
```
owner (auth.users)
   └─< properties
          └─< leases >── tenants
                  └─< charges
                         ├─< payments
                         └─< whatsapp_messages
webhook_events (idempotência, isolado)
```

## Tabelas

### properties (imóveis)
| coluna       | tipo        | notas                                  |
|--------------|-------------|----------------------------------------|
| id           | uuid PK     | `default gen_random_uuid()`            |
| owner_id     | uuid        | FK `auth.users`                        |
| nome         | text        | ex.: "Apto 302 - Ed. Aurora"           |
| endereco     | text        |                                        |
| tipo         | text        | `apartamento` / `casa` / `comercial`   |
| created_at   | timestamptz | `default now()`                        |

### tenants (inquilinos)
| coluna       | tipo        | notas                                  |
|--------------|-------------|----------------------------------------|
| id           | uuid PK     |                                        |
| owner_id     | uuid        | FK `auth.users`                        |
| nome         | text        |                                        |
| telefone     | text        | E.164, usado no WhatsApp               |
| email        | text        | nullable                               |
| cpf          | text        | nullable, mascarado na UI              |
| created_at   | timestamptz |                                        |

### leases (contratos)
| coluna         | tipo        | notas                                |
|----------------|-------------|--------------------------------------|
| id             | uuid PK     |                                      |
| owner_id       | uuid        | FK `auth.users`                      |
| property_id    | uuid        | FK `properties`                      |
| tenant_id      | uuid        | FK `tenants`                         |
| valor_centavos | integer     | aluguel mensal                       |
| dia_vencimento | smallint    | 1–28                                 |
| inicio         | date        |                                      |
| fim            | date        | nullable                             |
| ativo          | boolean     | `default true`                       |
| created_at     | timestamptz |                                      |

### charges (cobranças)
| coluna           | tipo        | notas                                            |
|------------------|-------------|--------------------------------------------------|
| id               | uuid PK     |                                                  |
| owner_id         | uuid        | FK `auth.users`                                  |
| lease_id         | uuid        | FK `leases`                                       |
| competencia      | date        | 1º dia do mês de referência (`2026-07-01`)       |
| valor_centavos   | integer     |                                                  |
| vencimento       | date        |                                                  |
| status           | text        | `pendente`/`pago`/`vencido`/`cancelado`          |
| mp_payment_id    | text        | id do pagamento no Mercado Pago, nullable        |
| mp_preference_id | text        | nullable                                         |
| pix_copia_cola   | text        | nullable                                         |
| link_pagamento   | text        | nullable                                         |
| pago_em          | timestamptz | nullable                                         |
| created_at       | timestamptz |                                                  |
| **unique**       |             | `(lease_id, competencia)` evita cobrança dupla   |

### payments (registro de pagamentos / auditoria)
| coluna         | tipo        | notas                                 |
|----------------|-------------|---------------------------------------|
| id             | uuid PK     |                                       |
| charge_id      | uuid        | FK `charges`                          |
| mp_payment_id  | text        |                                       |
| status         | text        | `approved`/`pending`/`rejected`...    |
| valor_centavos | integer     |                                       |
| metodo         | text        | `pix`/`boleto`/`credit_card`          |
| raw            | jsonb       | payload bruto do MP                   |
| created_at     | timestamptz |                                       |

### whatsapp_messages (log de envios)
| coluna     | tipo        | notas                                      |
|------------|-------------|--------------------------------------------|
| id         | uuid PK     |                                            |
| charge_id  | uuid        | FK `charges`, nullable                     |
| tenant_id  | uuid        | FK `tenants`                               |
| template   | text        | nome do template enviado                   |
| wamid      | text        | id da mensagem retornado pela Graph API    |
| status     | text        | `enviado`/`entregue`/`lido`/`falhou`       |
| erro       | text        | nullable                                   |
| created_at | timestamptz |                                            |

### webhook_events (idempotência)
| coluna       | tipo        | notas                                    |
|--------------|-------------|------------------------------------------|
| id           | uuid PK     |                                          |
| source       | text        | `mercadopago`/`whatsapp`                 |
| event_id     | text        | id único do evento (dedupe)              |
| payload      | jsonb       |                                          |
| processed_at | timestamptz |                                          |
| **unique**   |             | `(source, event_id)`                     |

## RLS (esboço)
- Habilitar RLS em todas as tabelas de negócio.
- Policy de leitura/escrita: `owner_id = auth.uid()`.
- Service role (backend/cron/webhooks) ignora RLS por usar a `service_role_key`.

## Estados da cobrança (máquina de estados)
```
            gerar
  (none) ─────────► pendente
                       │  webhook approved
                       ├──────────────────► pago
                       │  vencimento < hoje
                       ├──────────────────► vencido ──(webhook approved)──► pago
                       │  admin cancela
                       └──────────────────► cancelado
```
