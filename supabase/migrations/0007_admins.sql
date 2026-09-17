-- 0007: várias contas de administrador na mesma "conta" (mesmos dados).
--
-- Modelo: o proprietário original continua sendo o `owner_id` de todos os
-- registros. Cada administrador adicional é um usuário do Supabase Auth com
-- uma linha em `account_members` apontando para esse `owner_id`.
-- `public.current_owner_id()` resolve, para o usuário logado, qual `owner_id`
-- ele enxerga (o dele mesmo, se for o proprietário; o do proprietário, se for
-- membro). Todas as policies passam a comparar com essa função em vez de
-- `auth.uid()`, então NENHUMA query do app precisa mudar de forma — só o
-- `owner_id` gravado em inserts (o app usa `user.ownerId`, resolvido da sessão).
--
-- Convites: gerados pelo painel (service role) como link de uso único
-- (`auth.admin.generateLink`), compartilhado por WhatsApp; ao ativar, o
-- convidado cria a própria senha.

create table public.account_members (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  nome          text not null,
  email         text not null,
  telefone      text,
  convidado_por uuid references auth.users (id) on delete set null,
  aceito_em     timestamptz,
  created_at    timestamptz not null default now(),
  constraint account_members_nao_e_o_dono check (user_id <> owner_id)
);

create index account_members_owner_id_idx on public.account_members (owner_id);

alter table public.account_members enable row level security;

-- Resolve o "dono" dos dados para o usuário logado. SECURITY DEFINER para ler
-- account_members sem depender das policies da própria tabela.
create or replace function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select m.owner_id from public.account_members m where m.user_id = auth.uid()),
    auth.uid()
  );
$$;

revoke all on function public.current_owner_id() from public;
grant execute on function public.current_owner_id() to authenticated, anon, service_role;

-- Membros enxergam os outros membros da mesma conta (lista de administradores).
-- Insert/update/delete só pelo backend (service role), via Server Actions.
create policy "members_select_account_members" on public.account_members
  for select using (owner_id = public.current_owner_id());

-- Policies existentes: `owner_id = auth.uid()` -> `owner_id = current_owner_id()`.
alter policy "owner_select_properties" on public.properties using (owner_id = public.current_owner_id());
alter policy "owner_insert_properties" on public.properties with check (owner_id = public.current_owner_id());
alter policy "owner_update_properties" on public.properties using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_properties" on public.properties using (owner_id = public.current_owner_id());
alter policy "owner_select_tenants" on public.tenants using (owner_id = public.current_owner_id());
alter policy "owner_insert_tenants" on public.tenants with check (owner_id = public.current_owner_id());
alter policy "owner_update_tenants" on public.tenants using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_tenants" on public.tenants using (owner_id = public.current_owner_id());
alter policy "owner_select_leases" on public.leases using (owner_id = public.current_owner_id());
alter policy "owner_insert_leases" on public.leases with check (owner_id = public.current_owner_id());
alter policy "owner_update_leases" on public.leases using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_leases" on public.leases using (owner_id = public.current_owner_id());
alter policy "owner_select_charges" on public.charges using (owner_id = public.current_owner_id());
alter policy "owner_insert_charges" on public.charges with check (owner_id = public.current_owner_id());
alter policy "owner_update_charges" on public.charges using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_charges" on public.charges using (owner_id = public.current_owner_id());
alter policy "owner_select_payments" on public.payments using (owner_id = public.current_owner_id());
alter policy "owner_insert_payments" on public.payments with check (owner_id = public.current_owner_id());
alter policy "owner_update_payments" on public.payments using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_payments" on public.payments using (owner_id = public.current_owner_id());
alter policy "owner_select_whatsapp_messages" on public.whatsapp_messages using (owner_id = public.current_owner_id());
alter policy "owner_insert_whatsapp_messages" on public.whatsapp_messages with check (owner_id = public.current_owner_id());
alter policy "owner_update_whatsapp_messages" on public.whatsapp_messages using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
alter policy "owner_delete_whatsapp_messages" on public.whatsapp_messages using (owner_id = public.current_owner_id());
alter policy "owner_select_settings" on public.settings using (owner_id = public.current_owner_id());
alter policy "owner_insert_settings" on public.settings with check (owner_id = public.current_owner_id());
alter policy "owner_update_settings" on public.settings using (owner_id = public.current_owner_id()) with check (owner_id = public.current_owner_id());
