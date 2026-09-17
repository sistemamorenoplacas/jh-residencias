-- 0008: rastreamento de mensagens/links + parâmetros de cobrança nas configurações.
-- Depende da 0007 (public.current_owner_id()).

-- 1) Quando a mensagem foi entregue/lida (o webhook da Meta manda o timestamp).
alter table public.whatsapp_messages
  add column if not exists entregue_em timestamptz,
  add column if not exists lido_em     timestamptz;

-- 2) Aberturas do link de pagamento (registradas pela própria página pública,
--    via beacon do navegador — previews de link não executam JS, então não contam).
create table if not exists public.charge_link_views (
  id         uuid primary key default gen_random_uuid(),
  charge_id  uuid not null references public.charges (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  pagina     text not null check (pagina in ('pix', 'boleto')),
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists charge_link_views_charge_idx on public.charge_link_views (charge_id, created_at desc);
create index if not exists charge_link_views_owner_idx  on public.charge_link_views (owner_id);

alter table public.charge_link_views enable row level security;

-- Painel só lê; a inserção é feita pelo backend (service role) na página pública.
create policy "owner_select_charge_link_views" on public.charge_link_views
  for select using (owner_id = public.current_owner_id());

-- 3) Parâmetros de cobrança (padrões da conta).
alter table public.settings
  add column if not exists multa_percent     numeric(5, 2) not null default 2.0
    check (multa_percent >= 0 and multa_percent <= 20),
  add column if not exists juros_mes_percent numeric(5, 2) not null default 1.0
    check (juros_mes_percent >= 0 and juros_mes_percent <= 20),
  add column if not exists carencia_dias     smallint not null default 0
    check (carencia_dias between 0 and 30),
  -- Dias em relação ao vencimento em que o lembrete é enviado (negativo = antes).
  add column if not exists lembrete_marcos   smallint[] not null default '{-3,0,1,5}';
