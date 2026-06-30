# JH Residências — Templates do WhatsApp (Meta)

Guia para criar os 3 templates de mensagem aprovados na Meta. Os textos abaixo
**casam exatamente** com o que o código em `src/lib/whatsapp.ts` envia (nomes,
idioma `pt_BR`, ordem dos `{{n}}`, somente componente `body`). Não altere os
nomes nem a ordem das variáveis sem ajustar o código.

## Os 3 templates

| Template | Categoria | Idioma | Variáveis (na ordem) |
|---|---|---|---|
| `cobranca_aluguel` | UTILITY | pt_BR | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor · `{{4}}` vencimento · `{{5}}` link/Pix |
| `lembrete_vencimento` | UTILITY | pt_BR | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor · `{{4}}` vencimento · `{{5}}` link/Pix |
| `pagamento_confirmado` | UTILITY | pt_BR | `{{1}}` nome · `{{2}}` competência · `{{3}}` valor |

A definição-fonte (com textos e exemplos) fica em
[`scripts/whatsapp/templates.json`](../scripts/whatsapp/templates.json).

> **Atenção ao formato do valor `{{3}}`** (já tratado nos textos):
> - `cobranca_aluguel`: o chamador (`formatAmount`) envia **sem** `R$` (ex.: `1.850,00`) → o texto traz o literal `R$ {{3}}`.
> - `lembrete_vencimento` e `pagamento_confirmado`: o chamador (`formatBRL`) envia **com** `R$` (ex.: `R$ 1.850,00`) → o texto traz só `{{3}}`.
>
> Se algum dia você padronizar a formatação no código, ajuste o texto do template
> correspondente para não duplicar/omitir o `R$`.

## Pré-requisitos

1. App no **Meta for Developers** com o produto **WhatsApp**.
2. **WABA** (WhatsApp Business Account) + número verificado.
3. **`WHATSAPP_TOKEN`**: token de um **system user** com a permissão
   `whatsapp_business_management` (criar/gerir templates).
4. **`WHATSAPP_WABA_ID`**: o id da WABA (Business Manager → WhatsApp Accounts).
   É **diferente** do `WHATSAPP_PHONE_NUMBER_ID` (esse é só para enviar mensagens).

Preencha `WHATSAPP_TOKEN` e `WHATSAPP_WABA_ID` no `.env.local` (ver `.env.example`).

## Opção A — Script (recomendado)

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
- é seguro de re-rodar: se um template já existe, ele **pula** (não duplica);
- sai com código ≠ 0 se algum template falhar.

Após criar, os templates ficam em **PENDING** até a Meta aprovar. UTILITY
costuma ser aprovado rápido. Acompanhe com `--list` ou no WhatsApp Manager.

## Opção B — Manual (WhatsApp Manager)

Em **business.facebook.com → WhatsApp Manager → Modelos de mensagem → Criar
modelo**, para cada um: categoria **UTILITY**, idioma **Português (BR)**, só o
corpo (sem cabeçalho/botões), colando o texto abaixo.

### `cobranca_aluguel`
```
Olá {{1}}! Sua cobrança de aluguel referente a {{2}} no valor de R$ {{3}} vence em {{4}}.

Pague pelo Pix (copia e cola) ou pelo link: {{5}}

Qualquer dúvida, é só responder esta mensagem.
```
Exemplos: `{{1}}=Marina Couto` · `{{2}}=Julho/2026` · `{{3}}=1.850,00` · `{{4}}=10/07/2026` · `{{5}}=https://mpago.la/2Xy9Zk`

### `lembrete_vencimento`
```
Olá {{1}}! Lembrete: o aluguel referente a {{2}} no valor de {{3}} vence em {{4}}.

Para evitar juros, pague pelo Pix ou pelo link: {{5}}

Obrigado!
```
Exemplos: `{{1}}=Marina Couto` · `{{2}}=Julho/2026` · `{{3}}=R$ 1.850,00` · `{{4}}=10/07/2026` · `{{5}}=https://mpago.la/2Xy9Zk`

### `pagamento_confirmado`
```
Olá {{1}}! Confirmamos o recebimento do seu pagamento do aluguel referente a {{2}} no valor de {{3}}. Obrigado!
```
Exemplos: `{{1}}=Marina Couto` · `{{2}}=Julho/2026` · `{{3}}=R$ 1.850,00`

## Notas de aprovação (Meta)

- O corpo **não pode começar nem terminar** com uma variável — os textos acima já seguem essa regra.
- As variáveis devem ser sequenciais a partir de `{{1}}`, sem lacunas.
- Forneça valores de exemplo representativos (o script já envia).
- `UTILITY` é para mensagens transacionais (cobrança/lembrete/confirmação) — evite tom de marketing para não cair em `MARKETING`.
- O `{{5}}` é um link dentro do corpo (não um botão). Mantenha assim: o código envia apenas o componente `body`.
