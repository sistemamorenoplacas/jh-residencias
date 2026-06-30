-- =============================================================================
-- DEV SEED — nao rodar em producao
-- =============================================================================
-- Popula dados de exemplo para desenvolvimento local.
--
-- COMO USAR:
--   1. Crie um usuário no Supabase Auth (painel ou signup) e copie o UUID dele.
--   2. Substitua TODAS as ocorrências do placeholder abaixo pelo UUID real:
--        00000000-0000-0000-0000-000000000001
--      (no psql: \set owner '<seu-uuid>' e use :'owner', ou um simples find/replace)
--   3. Rode este arquivo APENAS em ambiente de desenvolvimento.
--
-- Os IDs de properties/tenants/leases/charges são fixos para facilitar
-- re-execução idempotente via ON CONFLICT.
-- =============================================================================

-- Owner placeholder — SUBSTITUA pelo UUID real do auth.users antes de rodar.
-- \set owner_id '00000000-0000-0000-0000-000000000001'

begin;

-- properties --------------------------------------------------------------
insert into public.properties (id, owner_id, nome, endereco, tipo) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001',
   'Apto 302 - Ed. Aurora', 'Rua das Acácias, 120 - apto 302', 'apartamento'),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001',
   'Casa Vila Verde', 'Rua dos Ipês, 45', 'casa')
on conflict (id) do nothing;

-- tenants -----------------------------------------------------------------
insert into public.tenants (id, owner_id, nome, telefone, email, cpf) values
  ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001',
   'Maria Oliveira', '+5511988887777', 'maria@example.com', '123.456.789-00'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001',
   'João Santos', '+5511977776666', null, null)
on conflict (id) do nothing;

-- leases ------------------------------------------------------------------
insert into public.leases
  (id, owner_id, property_id, tenant_id, valor_centavos, dia_vencimento, inicio, fim,
   multa_percent, juros_mes_percent, ativo)
values
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001',
   'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111',
   153000, 10, '2026-01-01', null, 2.0, 1.0, true),
  ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001',
   'a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
   210000, 5, '2026-03-01', null, 2.0, 1.0, true)
on conflict (id) do nothing;

-- charges -----------------------------------------------------------------
insert into public.charges
  (id, owner_id, lease_id, competencia, valor_centavos, vencimento, status, pago_em)
values
  ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001',
   'c1111111-1111-1111-1111-111111111111', '2026-06-01', 153000, '2026-06-10', 'pago',
   '2026-06-09T14:20:00Z'),
  ('d2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001',
   'c1111111-1111-1111-1111-111111111111', '2026-07-01', 153000, '2026-07-10', 'pendente',
   null),
  ('d3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001',
   'c2222222-2222-2222-2222-222222222222', '2026-06-01', 210000, '2026-06-05', 'vencido',
   null)
on conflict (lease_id, competencia) do nothing;

commit;
