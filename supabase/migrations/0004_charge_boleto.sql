-- =============================================================================
-- JH Residências — Migration 0004: dados de boleto na cobrança
-- =============================================================================
-- O boleto do Mercado Pago gera um pagamento próprio (id distinto do Pix), com
-- URL do boleto (transaction_details.external_resource_url) e linha digitável
-- (barcode.content). Guardamos esses dados na charge, ao lado do Pix, para a
-- página pública /pagar/boleto renderizar sem recriar o boleto a cada acesso.
--
-- Colunas nullable: charges antigas e o fluxo Pix seguem válidos sem boleto.
-- A reconciliação de pagamento continua por external_reference (= charge.id),
-- então o webhook confirma a charge tanto no Pix quanto no boleto.
-- =============================================================================

alter table public.charges
  add column if not exists boleto_url             text,
  add column if not exists boleto_linha_digitavel text,
  add column if not exists boleto_mp_payment_id   text;
