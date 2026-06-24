# JH Residências — Integrações

## 1. Mercado Pago

### Credenciais
- `MP_ACCESS_TOKEN` (produção) — obtido no painel de desenvolvedor do Mercado Pago.
- Configurar **URL de notificação (webhook)**: `https://APP_BASE_URL/api/webhooks/mercadopago`.
- Definir uma **chave secreta de assinatura** no painel → vira `MP_WEBHOOK_SECRET`.

### Criar cobrança Pix (fluxo recomendado p/ aluguel)
- Endpoint: `POST https://api.mercadopago.com/v1/payments`
- Corpo (resumo): `transaction_amount`, `payment_method_id: "pix"`, `payer.email`, `external_reference: <charge_id>`,
  `date_of_expiration` = vencimento.
- Resposta traz `id` (= `mp_payment_id`), `point_of_interaction.transaction_data.qr_code` (copia-e-cola) e `qr_code_base64`.
- Salvar `mp_payment_id`, `pix_copia_cola`, `link_pagamento` na `charge`.

> Alternativa: **Preference / Checkout Pro** (`/checkout/preferences`) se quiser uma página de pagamento com
> Pix + boleto + cartão num link único. Guarda `mp_preference_id` e usa `init_point` como `link_pagamento`.

### Webhook de pagamento
- MP envia `POST` com `?type=payment&data.id=<payment_id>` e header `x-signature` + `x-request-id`.
- **Validação de assinatura**: montar o manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e validar HMAC-SHA256
  com `MP_WEBHOOK_SECRET` comparando com o `v1` do header `x-signature`.
- **Nunca confie só no payload**: reconsultar `GET /v1/payments/<data.id>` para obter o status real (`approved`).
- Se `approved` → atualizar `charge.status = pago`, `pago_em = now()`, inserir em `payments`.
- Idempotência: gravar `webhook_events (source='mercadopago', event_id=<x-request-id ou payment_id+status>)`.

### Mapa de status MP → charge
| status MP   | ação na charge          |
|-------------|-------------------------|
| approved    | `pago`                  |
| pending     | mantém `pendente`       |
| in_process  | mantém `pendente`       |
| rejected    | mantém `pendente` (log) |
| cancelled   | mantém / `cancelado`    |
| refunded    | reverter p/ `pendente`  |

## 2. WhatsApp Cloud API (Meta)

### Pré-requisitos
- Conta no **Meta for Developers** + app com produto **WhatsApp**.
- **Número verificado** + **WABA** (WhatsApp Business Account).
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (token permanente de system user), `WHATSAPP_APP_SECRET`.
- Configurar webhook em `https://APP_BASE_URL/api/webhooks/whatsapp` com `WHATSAPP_VERIFY_TOKEN`.

### Templates (precisam de aprovação da Meta)
Como a cobrança parte da empresa (fora da janela de 24h), **só pode usar template aprovado**. Sugestões:

**`cobranca_aluguel`** (categoria: UTILITY)
```
Olá {{1}}! Sua cobrança do aluguel referente a {{2}} no valor de R$ {{3}}
vence em {{4}}.

Pague pelo link: {{5}}
```
- `{{1}}` nome do inquilino · `{{2}}` competência (Julho/2026) · `{{3}}` valor · `{{4}}` vencimento · `{{5}}` link/Pix.

**`lembrete_vencimento`** (UTILITY) — texto de lembrete D-3 / vencido.
**`pagamento_confirmado`** (UTILITY) — confirmação após webhook.

### Enviar template
- `POST https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages`
- Header: `Authorization: Bearer <WHATSAPP_TOKEN>`.
- Body: `type: "template"`, `template.name`, `template.language.code: "pt_BR"`, `components[].parameters` com os `{{n}}`.
- Resposta traz `messages[0].id` (= `wamid`) → salvar em `whatsapp_messages`.

### Webhook de status
- `GET` para verificação inicial: ecoar `hub.challenge` se `hub.verify_token == WHATSAPP_VERIFY_TOKEN`.
- `POST` com atualizações: `entry[].changes[].value.statuses[]` (`sent`/`delivered`/`read`/`failed`).
- Validar `X-Hub-Signature-256` (HMAC-SHA256 do corpo com `WHATSAPP_APP_SECRET`).
- Atualizar `whatsapp_messages.status` pelo `wamid`.

## 3. Agendamento (Vercel Cron)
`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/gerar-cobrancas", "schedule": "0 9 1 * *" },
    { "path": "/api/cron/lembretes",       "schedule": "0 9 * * *" }
  ]
}
```
Cada handler valida `Authorization: Bearer $CRON_SECRET` antes de executar.

## 4. Checklist de contas a criar
- [ ] Projeto Supabase (URL, anon key, service role key).
- [ ] App Mercado Pago + access token + webhook secret.
- [ ] App Meta/WhatsApp + número verificado + templates submetidos.
- [ ] Projeto Vercel + env vars + domínio (`APP_BASE_URL`).
