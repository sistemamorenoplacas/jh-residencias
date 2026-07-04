import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = { title: "Inquilinos — JH Residências" };
import { TenantList } from "@/components/inquilinos/TenantList";
import { createServerClient } from "@/lib/supabase/server";
import type { DbTenant } from "@/lib/db-types";
import type { Tenant } from "@/lib/types";

/**
 * Página de inquilinos (Server Component).
 *
 * Busca os inquilinos via client SSR (RESPEITA RLS: `owner_id = auth.uid()`),
 * então só retornam os do dono autenticado. O guard de sessão vive no layout
 * do grupo `(painel)`. Mapeia o shape cru `DbTenant` (snake_case) para o tipo
 * de domínio `Tenant` (camelCase) na borda, antes de entregar à UI.
 */

/** Mapeia a linha do banco para o tipo de domínio consumido pela UI. */
function toTenant(row: DbTenant): Tenant {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    cpf: row.cpf,
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    bairro: row.bairro,
    cidade: row.cidade,
    uf: row.uf,
  };
}

export default async function InquilinosPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, nome, telefone, email, cpf, cep, logradouro, numero, bairro, cidade, uf, owner_id, created_at",
    )
    .order("nome", { ascending: true });

  const tenants: Tenant[] = error ? [] : (data as DbTenant[]).map(toTenant);

  return (
    <AppShell title="Inquilinos" subtitle="Cadastro e contatos">
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido"
        >
          Não foi possível carregar os inquilinos. Tente recarregar a página.
        </p>
      ) : null}

      <TenantList tenants={tenants} />
    </AppShell>
  );
}
