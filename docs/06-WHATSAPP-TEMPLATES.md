# JH Residências — Templates do WhatsApp (Meta)

Guia dos 3 templates de mensagem aprovados na Meta. A estrutura abaixo **casa
exatamente** com o que o código em `src/lib/whatsapp.ts` envia (nomes, idioma
`pt_BR`, ordem dos `{{n}}` do corpo e a ordem dos botões). Não altere os nomes,
a ordem das variáveis nem a ordem dos botões sem ajustar o código.

## Os 3 templates

| Template | Categoria | Variáveis do corpo (na ordem) | Botões |
|---|---|---|---|
| `cobranca_aluguel` | UTILITY | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor · `{{4}}` vencimento | Pix (0) · Boleto (1) |
| `lembrete_vencimento` | UTILITY | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor · `{{4}}` vencimento | Pix (0) · Boleto (1) |
| `pagamento_confirmado` | UTILITY | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor | — |

Todos têm cabeçalho de texto `JH RESIDÊNCIAS` e rodapé `Gestão de aluguéis`.

A definição-fonte (textos, exemplos e botões) fica em
[`scripts/whatsapp/templates.json`](../scripts/whatsapp/templates.json).

### Botões de pagamento (URL dinâmica)

| Botão | Índice | URL do site (na Meta) | Sufixo enviado pelo código |
|---|---|---|---|
| Pagar com Pix | 0 | `https://pay.jhresidencias.com/pix/{{1}}` | `charge.id` |
| Pagar com Boleto | 1 | `https://pay.jhresidencias.com/boleto/{{1}}` | `charge.id` |

- O código manda **só o sufixo** (`chargeId`) para cada botão; a base da URL
  vive no template aprovado. Para mudar o domínio, edite o template na Meta.
- Mantenha a **barra antes do `{{1}}`** (`/pix/{{1}}`). O app tolera o boleto
  sem barra (redirect em `next.config.ts`), mas o certo é com barra.
- `pay.jhresidencias.com` só funciona com `PAY_HOST` definido no deploy
  (ver `.env.example`). Links antigos em `www.jhresidencias.com/pagar/...`
  continuam válidos: o proxy redireciona para o domínio de pagamento.

> **Formato do valor `{{3}}`** (já tratado nos textos):
> - `cobranca_aluguel`: o chamador (`formatAmount`) envia **sem** `R$`
>   (ex.: `1.500,00`) → o texto traz o literal `R$ {{3}}`.
> - `lembrete_vencimento` e `pagamento_confirmado`: o chamador (`formatBRL`)
>   envia **com** `R$` (ex.: `R$ 1.500,00`) → o texto traz só `{{3}}`.

## Pré-requisitos

1. App no **Meta for Developers** com o produto **WhatsApp**.
2. **WABA** (WhatsApp Business Account) + número verificado.
3. **`WHATSAPP_TOKEN`**: token de um **system user** com a permissão
   `whatsapp_business_management` (criar/gerir templates).
4. **`WHATSAPP_WABA_ID`**: o id da WABA (Business Manager → WhatsApp Accounts).
   É **diferente** do `WHATSAPP_PHONE_NUMBER_ID` (esse é só para enviar mensagens).

Preencha `WHATSAPP_TOKEN` e `WHATSAPP_WABA_ID` no `.env.local` (ver `.env.example`).

## Opção A — Script (recomendado para uma WABA nova)

```bash
# pré-visualizar os payloads (não chama a Meta)
npm run whatsapp:templates -- --dry-run

# criar os 3 templates na WABA
npm run whatsapp:templates

# listar o que já existe na WABA (e o status de aprovação)
npm run whatsapp:templates:list
```

O script ([`scripts/whatsapp/create-templates.mjs`](../scripts/whatsapp/create-templates.mjs)):
- não tem dependências (usa `fetch` nativo, Node ≥ 18);
- lê `WHATSAPP_TOKEN` / `WHATSAPP_WABA_ID` do `.env.local` ou do ambiente;
- é seguro de re-rodar: se um template já existe, ele **pula** (não duplica —
  e também **não edita**; para alterar um template existente use a Opção B);
- sai com código ≠ 0 se algum template falhar.

Após criar, os templates ficam em **PENDING** até a Meta aprovar. UTILITY
costuma ser aprovado rápido. Acompanhe com `--list` ou no WhatsApp Manager.

## Opção B — Manual (WhatsApp Manager)

Em **business.facebook.com → WhatsApp Manager → Modelos de mensagem**, para
cada um: categoria **UTILITY**, idioma **Português (BR)**, cabeçalho de texto
`JH RESIDÊNCIAS`, corpo abaixo, rodapé `Gestão de aluguéis` e, quando houver,
os dois botões **Acessar o site → URL dinâmica** na ordem Pix, Boleto.

### `cobranca_aluguel`
```
Olá, {{1}}! 👋
Segue a cobrança do aluguel de {{2}}.

💰 *Valor:* R$ {{3}}
📅 *Vencimento:* {{4}}

Escolha abaixo como pagar. No Pix você vê o QR Code e o copia e cola; no boleto, a linha digitável.
```
Exemplos: `{{1}}=Maria Oliveira` · `{{2}}=julho/2026` · `{{3}}=1.500,00` · `{{4}}=10/07/2026`
Botões: `Pagar com Pix` → `https://pay.jhresidencias.com/pix/` (amostra `.../pix/abc123`) ·
`Pagar com Boleto` → `https://pay.jhresidencias.com/boleto/` (amostra `.../boleto/abc123`).

### `lembrete_vencimento`
```
Olá, {{1}}! 👋
Lembrete: o aluguel de {{2}} ainda está em aberto.

💰 *Valor:* {{3}}
📅 *Vencimento:* {{4}}

Para evitar multa e juros, escolha abaixo como pagar. No Pix você vê o QR Code e o copia e cola; no boleto, a linha digitável.
```
Exemplos: `{{1}}=Maria Oliveira` · `{{2}}=julho/2026` · `{{3}}=R$ 1.500,00` · `{{4}}=10/07/2026`
Botões: iguais aos de `cobranca_aluguel`.

### `pagamento_confirmado`
```
Olá, {{1}}! ✅
Confirmamos o recebimento do pagamento do aluguel de {{2}}, no valor de {{3}}.

Obrigado!
```
Exemplos: `{{1}}=Maria Oliveira` · `{{2}}=julho/2026` · `{{3}}=R$ 1.500,00`

## Notas de aprovação e edição (Meta)

- O corpo **não pode começar nem terminar** com uma variável — os textos acima
  já seguem essa regra.
- As variáveis devem ser sequenciais a partir de `{{1}}`, sem lacunas.
- Na Meta, o `{{1}}` do botão é acrescentado automaticamente ao fim da "URL do
  site" — não digite `{{1}}` no campo.
- Um template **aprovado** pode ser editado 1 vez a cada 24 h (10 por mês) e
  volta para análise; enquanto isso a versão anterior continua sendo usada.
- `UTILITY` é para mensagens transacionais (cobrança/lembrete/confirmação) —
  evite tom de marketing para não cair em `MARKETING`.
