import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import {
  DashboardView,
  type DashboardPortfolio,
} from "@/components/dashboard/DashboardView";
import { formatCompetencia } from "@/lib/dates";
import { competenciaAtual } from "@/lib/charge-generation";
import { buscarChargeRowsDoMes } from "@/lib/charges-query";
import { buscarTendencias6Meses } from "@/lib/dashboard";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visão Geral — JH Residências" };
const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

async function carregarPortfolio(): Promise<DashboardPortfolio> {
  try {
    const supabase = await createServerClient();
    // Both reads use the authenticated client and remain scoped by owner RLS.
    const [properties, leases] = await Promise.all([
      supabase
        .from("properties")
        .select("id, nome, endereco, tipo, foto_url")
        .order("created_at", { ascending: false }),
      supabase
        .from("leases")
        .select("property_id, valor_centavos")
        .eq("ativo", true),
    ]);
    if (properties.error || leases.error)
      throw new Error("Falha ao carregar portfólio");
    return {
      properties: properties.data ?? [],
      leases: leases.data ?? [],
      failed: false,
    };
  } catch {
    return { properties: [], leases: [], failed: true };
  }
}

export default async function PainelPage() {
  const hoje = new Date();
  const [chargesResult, tendencias, portfolio] = await Promise.all([
    buscarChargeRowsDoMes()
      .then((rows) => ({ rows, failed: false }))
      .catch(() => ({ rows: [], failed: true })),
    buscarTendencias6Meses(hoje),
    carregarPortfolio(),
  ]);
  const subtitle = formatCompetencia(competenciaAtual(hoje));
  const labels = Array.from(
    { length: 6 },
    (_, index) =>
      MESES[
        new Date(hoje.getFullYear(), hoje.getMonth() - 5 + index, 1).getMonth()
      ],
  );

  return (
    <AppShell title="Visão geral" variant="dashboard">
      <DashboardView
        charges={chargesResult.rows}
        chargesFailed={chargesResult.failed}
        tendencias={tendencias}
        portfolio={portfolio}
        subtitle={subtitle}
        labels={labels}
      />
    </AppShell>
  );
}
