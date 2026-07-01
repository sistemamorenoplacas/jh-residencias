import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cobranças — JH Residências" };

import { AppShell } from "@/components/shell/AppShell";
import { ChargesTable } from "@/components/charges/ChargesTable";
import {
  GerarAvulsaButton,
  type LeaseOption,
} from "@/components/charges/GerarAvulsaButton";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { ChargeRow, ChargeStatus } from "@/lib/types";
import { diasAtraso } from "@/lib/charges";

/** Filtros aceitos na URL (?status=&competencia=). */
interface CobrancasSearchParams {
  status?: string;
  competencia?: string;
}

const STATUS_VALIDOS: ChargeStatus[] = [
  "pendente",
  "pago",
  "vencido",
  "cancelado",
];

const STATUS_FILTROS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "pendente", label: "Pendentes" },
  { value: "vencido", label: "Vencidas" },
  { value: "pago", label: "Pagas" },
  { value: "cancelado", label: "Canceladas" },
];

/** Shape do join charges -> leases -> (tenants, properties). */
interface ChargeJoinRow {
  id: string;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  status: ChargeStatus;
  leases: {
    tenants: { nome: string } | null;
    properties: { nome: string } | null;
  } | null;
}

interface LeaseJoinRow {
  id: string;
  tenants: { nome: string } | null;
  properties: { nome: string } | null;
}

function isStatus(value: string): value is ChargeStatus {
  return (STATUS_VALIDOS as string[]).includes(value);
}

/** `ChargeJoinRow` -> `ChargeRow` (camelCase, desnormalizado p/ a tabela). */
function toChargeRow(row: ChargeJoinRow, hoje: Date): ChargeRow {
  const atraso =
    row.status === "vencido" ? diasAtraso(row.vencimento, hoje) : 0;
  return {
    id: row.id,
    inquilino: row.leases?.tenants?.nome ?? "—",
    imovel: row.leases?.properties?.nome ?? "—",
    competencia: row.competencia,
    vencimento: row.vencimento,
    valorCentavos: row.valor_centavos,
    status: row.status,
    diasAtraso: atraso,
  };
}

export default async function CobrancasPage({
  searchParams,
}: {
  searchParams: Promise<CobrancasSearchParams>;
}) {
  await requireUser();
  const params = await searchParams;
  const hoje = new Date();

  const statusFiltro =
    params.status && isStatus(params.status) ? params.status : null;
  const competenciaFiltro = params.competencia ?? null;

  const supabase = await createServerClient();

  let query = supabase
    .from("charges")
    .select(
      "id, competencia, vencimento, valor_centavos, status, leases!inner(tenants!inner(nome), properties!inner(nome))",
    )
    .order("vencimento", { ascending: false });

  if (statusFiltro) {
    query = query.eq("status", statusFiltro);
  }
  if (competenciaFiltro) {
    query = query.eq("competencia", competenciaFiltro);
  }

  const { data, error } = await query;

  const rows: ChargeRow[] = error
    ? []
    : ((data ?? []) as unknown as ChargeJoinRow[]).map((r) =>
        toChargeRow(r, hoje),
      );

  // Contratos ativos para o seletor de cobrança avulsa.
  const { data: leasesData } = await supabase
    .from("leases")
    .select("id, tenants!inner(nome), properties!inner(nome)")
    .eq("ativo", true);

  const leaseOptions: LeaseOption[] = (
    (leasesData ?? []) as unknown as LeaseJoinRow[]
  ).map((l) => ({
    id: l.id,
    inquilino: l.tenants?.nome ?? "—",
    imovel: l.properties?.nome ?? "—",
  }));

  return (
    <AppShell
      title="Cobranças"
      subtitle={`${rows.length} cobrança${rows.length === 1 ? "" : "s"}`}
      actions={<GerarAvulsaButton leases={leaseOptions} />}
    >
      <section aria-label="Filtros" className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTROS.map((f) => {
          const ativo = (statusFiltro ?? "") === f.value;
          const href = construirHref(f.value, competenciaFiltro);
          return (
            <Link
              key={f.value || "todas"}
              href={href}
              className={`rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-muted hover:bg-canvas"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </section>

      {error ? (
        <p className="rounded-card border border-vencido-tint bg-vencido-tint/40 p-4 text-sm text-vencido">
          Não foi possível carregar as cobranças. Tente novamente.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhuma cobrança encontrada
          </p>
          <p className="mt-1 text-sm text-faint">
            Ajuste os filtros ou gere uma nova cobrança.
          </p>
        </div>
      ) : (
        <ChargesTable rows={rows} />
      )}
    </AppShell>
  );
}

/** Monta o href preservando a competência ao trocar o status. */
function construirHref(
  status: string,
  competencia: string | null,
): string {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (competencia) sp.set("competencia", competencia);
  const qs = sp.toString();
  return qs ? `/cobrancas?${qs}` : "/cobrancas";
}
