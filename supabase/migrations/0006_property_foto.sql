-- =============================================================================
-- JH Residências — Migration 0006: foto do imóvel
-- =============================================================================
-- Guarda a URL pública da foto do imóvel e cria o bucket de Storage `imoveis`.
--
-- O upload é feito pelo servidor com a service role (ignora RLS de Storage);
-- o bucket é público para que a URL da foto seja exibível nas telas. Nenhuma
-- policy extra em storage.objects é necessária para este fluxo.
-- =============================================================================

alter table public.properties
  add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('imoveis', 'imoveis', true)
on conflict (id) do nothing;
