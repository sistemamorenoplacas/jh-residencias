-- =============================================================================
-- JH Residências — Migration 0005: configurações do admin (por dono)
-- =============================================================================
-- Uma linha por dono (owner_id). Guarda o contato de suporte exibido nas
-- páginas públicas de pagamento e os interruptores da automação (cobrança
-- automática e lembretes), lidos pelos crons.
--
-- Páginas públicas e crons leem via service_role (ignora RLS); o painel edita
-- com o client autenticado, coberto pelas policies owner = auth.uid().
-- =============================================================================

create table if not exists public.settings (
  owner_id            uuid primary key references auth.users (id) on delete cascade,
  suporte_whatsapp    text,
  suporte_email       text,
  cobranca_automatica boolean not null default true,
  lembretes_ativos    boolean not null default true,
  updated_at          timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "owner_select_settings" on public.settings
  for select using (owner_id = auth.uid());
create policy "owner_insert_settings" on public.settings
  for insert with check (owner_id = auth.uid());
create policy "owner_update_settings" on public.settings
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
