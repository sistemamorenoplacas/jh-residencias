-- =============================================================================
-- JH Residências — Migration 0003: endereço do inquilino (para boleto)
-- =============================================================================
-- O boleto do Mercado Pago exige o endereço do pagador (payer.address):
-- zip_code, street_name, street_number, neighborhood, city, federal_unit.
--
-- Colunas nullable: inquilinos existentes continuam válidos e o Pix segue
-- funcionando sem endereço. O boleto só é gerado quando o endereço está
-- completo (validado na geração da cobrança).
-- =============================================================================

alter table public.tenants
  add column if not exists cep        text,
  add column if not exists logradouro text,
  add column if not exists numero     text,
  add column if not exists bairro     text,
  add column if not exists cidade     text,
  add column if not exists uf         text check (uf is null or char_length(uf) = 2);
