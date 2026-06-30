-- =============================================================================
-- JH Residências — Migration inicial (schema + RLS)
-- =============================================================================
-- Valores monetários em CENTAVOS (integer). Datas ISO (date). Telefone E.164.
--
-- RLS: habilitado em todas as tabelas de negócio. As policies exigem
-- `owner_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE.
--
-- IMPORTANTE: o backend (cron, webhooks, repositórios server-only) usa a
-- SUPABASE_SERVICE_ROLE_KEY. A service_role IGNORA RLS por padrão — portanto
-- escritas de sistema (gerar cobranças, confirmar pagamento via webhook) não
-- precisam de policy de usuário. `webhook_events` é isolada e só é acessada
-- pela service_role (sem policy de usuário, RLS habilitado nega todo o resto).
-- =============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- properties (imóveis)
-- ----------------------------------------------------------------------------
create table public.properties (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  endereco   text not null,
  tipo       text not null check (tipo in ('apartamento', 'casa', 'comercial')),
  created_at timestamptz not null default now()
);

create index properties_owner_id_idx on public.properties (owner_id);

-- ----------------------------------------------------------------------------
-- tenants (inquilinos)
-- ----------------------------------------------------------------------------
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  telefone   text not null,
  email      text,
  cpf        text,
  created_at timestamptz not null default now()
);

create index tenants_owner_id_idx on public.tenants (owner_id);

-- ----------------------------------------------------------------------------
-- leases (contratos)
-- ----------------------------------------------------------------------------
create table public.leases (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,
  property_id       uuid not null references public.properties (id) on delete restrict,
  tenant_id         uuid not null references public.tenants (id) on delete restrict,
  valor_centavos    integer not null check (valor_centavos >= 0),
  dia_vencimento    smallint not null check (dia_vencimento between 1 and 28),
  inicio            date not null,
  fim               date,
  multa_percent     numeric(5, 2) not null default 2.0,
  juros_mes_percent numeric(5, 2) not null default 1.0,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

create index leases_owner_id_idx on public.leases (owner_id);
create index leases_property_id_idx on public.leases (property_id);
create index leases_tenant_id_idx on public.leases (tenant_id);

-- ----------------------------------------------------------------------------
-- charges (cobranças)
-- ----------------------------------------------------------------------------
create table public.charges (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  lease_id         uuid not null references public.leases (id) on delete cascade,
  competencia      date not null,
  valor_centavos   integer not null check (valor_centavos >= 0),
  vencimento       date not null,
  status           text not null default 'pendente'
                     check (status in ('pendente', 'pago', 'vencido', 'cancelado')),
  mp_payment_id    text,
  mp_preference_id text,
  pix_copia_cola   text,
  link_pagamento   text,
  pago_em          timestamptz,
  created_at       timestamptz not null default now(),
  -- evita cobrança dupla para o mesmo contrato/competência
  constraint charges_lease_competencia_key unique (lease_id, competencia)
);

create index charges_owner_id_idx on public.charges (owner_id);
create index charges_lease_id_idx on public.charges (lease_id);
create index charges_status_idx on public.charges (status);
create index charges_vencimento_idx on public.charges (vencimento);

-- ----------------------------------------------------------------------------
-- payments (registro de pagamentos / auditoria)
-- ----------------------------------------------------------------------------
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  charge_id      uuid not null references public.charges (id) on delete cascade,
  mp_payment_id  text not null,
  status         text not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  metodo         text not null,
  raw            jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  -- deduplica auditoria por pagamento+status: permite 'approved' e 'refunded'
  -- do mesmo mp_payment_id, mas barra duplicatas idênticas em reentregas
  constraint payments_mp_payment_status_key unique (mp_payment_id, status)
);

create index payments_owner_id_idx on public.payments (owner_id);
create index payments_charge_id_idx on public.payments (charge_id);

-- ----------------------------------------------------------------------------
-- whatsapp_messages (log de envios)
-- ----------------------------------------------------------------------------
create table public.whatsapp_messages (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  charge_id  uuid references public.charges (id) on delete set null,
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  template   text not null,
  wamid      text,
  status     text not null default 'enviado'
               check (status in ('enviado', 'entregue', 'lido', 'falhou')),
  erro       text,
  created_at timestamptz not null default now()
);

create index whatsapp_messages_owner_id_idx on public.whatsapp_messages (owner_id);
create index whatsapp_messages_charge_id_idx on public.whatsapp_messages (charge_id);
create index whatsapp_messages_tenant_id_idx on public.whatsapp_messages (tenant_id);

-- ----------------------------------------------------------------------------
-- webhook_events (idempotência — isolada, só service_role)
-- ----------------------------------------------------------------------------
create table public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  source       text not null check (source in ('mercadopago', 'whatsapp')),
  event_id     text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint webhook_events_source_event_id_key unique (source, event_id)
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.properties        enable row level security;
alter table public.tenants           enable row level security;
alter table public.leases            enable row level security;
alter table public.charges           enable row level security;
alter table public.payments          enable row level security;
alter table public.whatsapp_messages enable row level security;
-- webhook_events: RLS habilitado, SEM policy de usuário => somente service_role.
alter table public.webhook_events    enable row level security;

-- properties
create policy "owner_select_properties" on public.properties
  for select using (owner_id = auth.uid());
create policy "owner_insert_properties" on public.properties
  for insert with check (owner_id = auth.uid());
create policy "owner_update_properties" on public.properties
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_properties" on public.properties
  for delete using (owner_id = auth.uid());

-- tenants
create policy "owner_select_tenants" on public.tenants
  for select using (owner_id = auth.uid());
create policy "owner_insert_tenants" on public.tenants
  for insert with check (owner_id = auth.uid());
create policy "owner_update_tenants" on public.tenants
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_tenants" on public.tenants
  for delete using (owner_id = auth.uid());

-- leases
create policy "owner_select_leases" on public.leases
  for select using (owner_id = auth.uid());
create policy "owner_insert_leases" on public.leases
  for insert with check (owner_id = auth.uid());
create policy "owner_update_leases" on public.leases
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_leases" on public.leases
  for delete using (owner_id = auth.uid());

-- charges
create policy "owner_select_charges" on public.charges
  for select using (owner_id = auth.uid());
create policy "owner_insert_charges" on public.charges
  for insert with check (owner_id = auth.uid());
create policy "owner_update_charges" on public.charges
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_charges" on public.charges
  for delete using (owner_id = auth.uid());

-- payments
create policy "owner_select_payments" on public.payments
  for select using (owner_id = auth.uid());
create policy "owner_insert_payments" on public.payments
  for insert with check (owner_id = auth.uid());
create policy "owner_update_payments" on public.payments
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_payments" on public.payments
  for delete using (owner_id = auth.uid());

-- whatsapp_messages
create policy "owner_select_whatsapp_messages" on public.whatsapp_messages
  for select using (owner_id = auth.uid());
create policy "owner_insert_whatsapp_messages" on public.whatsapp_messages
  for insert with check (owner_id = auth.uid());
create policy "owner_update_whatsapp_messages" on public.whatsapp_messages
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_delete_whatsapp_messages" on public.whatsapp_messages
  for delete using (owner_id = auth.uid());
