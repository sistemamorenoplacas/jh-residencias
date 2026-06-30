import { AppShell } from "@/components/shell/AppShell";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { DbLease, DbProperty, DbTenant } from "@/lib/db-types";
import {
  LeaseList,
  type LeaseListItem,
} from "@/components/contratos/LeaseList";
import type { LeaseFormOption } from "@/components/contratos/LeaseForm";

/**
 * CRUD de Contratos (leases). Server Component: lê com o client RLS-aware,
 * então o escopo `owner_id = auth.uid()` é garantido pelas policies. Os dados
 * descem para `LeaseList` (client) que cuida da edição/criação inline.
 */

export const metadata = {
  title: "Contratos — JH Residências",
};

interface ContratosData {
  leases: LeaseListItem[];
  properties: LeaseFormOption[];
  tenants: LeaseFormOption[];
}

async function carregarContratos(): Promise<ContratosData> {
  const supabase = await createServerClient();

  const [leasesRes, propertiesRes, tenantsRes] = await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, property_id, tenant_id, valor_centavos, dia_vencimento, multa_percent, juros_mes_percent, inicio, fim, ativo",
      )
      .order("ativo", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("id, nome").order("nome"),
    supabase.from("tenants").select("id, nome").order("nome"),
  ]);

  if (leasesRes.error || propertiesRes.error || tenantsRes.error) {
    throw new Error("Falha ao carregar contratos.");
  }

  const properties = (propertiesRes.data ?? []) as Pick<DbProperty, "id" | "nome">[];
  const tenants = (tenantsRes.data ?? []) as Pick<DbTenant, "id" | "nome">[];
  const leases = (leasesRes.data ?? []) as Array<
    Omit<DbLease, "owner_id" | "created_at">
  >;

  const propertyById = new Map(properties.map((p) => [p.id, p.nome]));
  const tenantById = new Map(tenants.map((t) => [t.id, t.nome]));

  return {
    leases: leases.map((l) => ({
      id: l.id,
      propertyId: l.property_id,
      tenantId: l.tenant_id,
      valorCentavos: l.valor_centavos,
      diaVencimento: l.dia_vencimento,
      multaPercent: l.multa_percent,
      jurosMesPercent: l.juros_mes_percent,
      inicio: l.inicio,
      fim: l.fim,
      ativo: l.ativo,
      imovel: propertyById.get(l.property_id) ?? "Imóvel removido",
      inquilino: tenantById.get(l.tenant_id) ?? "Inquilino removido",
    })),
    properties: properties.map((p) => ({ id: p.id, label: p.nome })),
    tenants: tenants.map((t) => ({ id: t.id, label: t.nome })),
  };
}

export default async function ContratosPage() {
  await requireUser();
  const { leases, properties, tenants } = await carregarContratos();

  return (
    <AppShell title="Contratos" subtitle="Aluguéis vinculados a imóveis e inquilinos">
      <section>
        <LeaseList leases={leases} properties={properties} tenants={tenants} />
      </section>
    </AppShell>
  );
}
