# JH Residências — PRD (Product Requirements Document)

## Visão geral
Sistema interno para **gestão e cobrança de aluguel** de imóveis próprios. Permite cadastrar
imóveis e inquilinos, gerar cobranças mensais automaticamente, **disparar a cobrança via WhatsApp**
(com link/Pix de pagamento), e **monitorar pagamentos em tempo real via webhook do Mercado Pago**.
Inclui um painel administrativo básico com visão de inadimplência.

- **Stack:** Next.js (App Router) + Supabase (Postgres, Auth, RLS) + Mercado Pago + WhatsApp Cloud API (Meta)
- **Escala:** single-tenant (uso próprio de 1 proprietário). Schema já prevê `owner_id` para evolução SaaS.
- **Deploy:** Vercel (app + cron) + Supabase (banco gerenciado).

## Objetivos
1. Eliminar a cobrança manual de aluguel todo mês.
2. Saber, sem planilha, **quem pagou e quem não pagou**.
3. Centralizar histórico de cobranças, pagamentos e mensagens enviadas.

## Não-objetivos (fora do MVP)
- Geração de contrato/assinatura digital.
- Cálculo de IPTU, condomínio rateado, reajuste IGPM automático (fica como fase 2).
- Multi-imobiliária / multi-usuário com papéis (fica como fase 2).
- App mobile nativo (web responsivo cobre o MVP).

## Personas
- **Proprietário/Admin (você):** cadastra imóveis e inquilinos, acompanha o painel, reenvia cobranças.
- **Inquilino:** recebe a cobrança no WhatsApp e paga via Pix/boleto/cartão. Não tem login.

## Funcionalidades (MVP)
### F1 — Cadastro
- CRUD de imóveis (nome, endereço, tipo).
- CRUD de inquilinos (nome, telefone E.164, e-mail, valor do aluguel, dia de vencimento, contrato ativo/inativo).

### F2 — Geração de cobranças
- Job mensal gera uma `charge` para cada contrato ativo, com competência (mês), valor e vencimento.
- Geração manual avulsa também disponível no painel.

### F3 — Pagamento (Mercado Pago)
- Ao gerar a cobrança, cria a cobrança no Mercado Pago (Pix com QR + link de pagamento / boleto / cartão).
- Armazena `mp_payment_id` / `mp_preference_id`, link e QR.

### F4 — Disparo WhatsApp
- Envia template aprovado com valor, vencimento e link de pagamento.
- Lembretes automáticos: **D-3, no vencimento, D+1 e D+5** (atrasado).
- Botão de **reenviar cobrança** manualmente no painel.

### F5 — Monitoramento de pagamento (webhook)
- Endpoint recebe webhook do Mercado Pago, valida assinatura, atualiza a `charge` para `pago`.
- Registra o pagamento e (opcional) envia confirmação no WhatsApp.

### F6 — Painel administrativo
- KPIs do mês: total a receber, recebido, pendente, **inadimplência**.
- Lista de cobranças com status (pendente / pago / vencido / cancelado).
- Histórico de mensagens enviadas por inquilino.

## Métricas de sucesso
- 100% das cobranças do mês disparadas automaticamente.
- Status de pagamento atualizado em < 1 min após o pagamento (via webhook).
- Painel mostra inadimplência em tempo real sem trabalho manual.

## Riscos
- **WhatsApp Cloud API** exige número verificado + templates aprovados pela Meta (prazo de aprovação).
- **Mercado Pago**: validar assinatura do webhook (`x-signature`) e tratar idempotência (notificações duplicadas).
- LGPD: telefone/e-mail/CPF são dados pessoais — manter no Supabase com RLS e acesso só via service role no server.
