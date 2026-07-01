import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/shell/AppShell";
import {
  ChargeDetail,
  type ChargeDetailData,
} from "@/components/charges/ChargeDetail";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { ChargeStatus } from "@/lib/types";
import { valorDevido, type ValorDevido } from "@/lib/charges";

/** Shape do join charges -> leases -> (tenants, properties). */
interface ChargeDetailRow {
  id: string;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  status: ChargeStatus;
  pix_copia_cola: string | null;
  link_pagamento: string | null;
  pago_em: string | null;
  leases: {
    multa_percent: number;
    juros_mes_percent: number;
    tenants: { nome: string } | null;
    properties: { nome: string } | null;
  } | null;
}

const IconBack = (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/**
 * Calcula o valor devido. Para charges em aberto (pendente/vencido) aplica
 * multa/juros via `valorDevido`. Para pago/cancelado, mostra só a base.
 */
function calcularValor(row: ChargeDetailRow, hoje: Date): ValorDevido {
  const emAberto = row.status === "pendente" || row.status === "vencido";
  if (!emAberto) {
    return {
      baseCentavos: row.valor_centavos,
      multaCentavos: 0,
      jurosCentavos: 0,
      totalCentavos: row.valor_centavos,
      diasAtraso: 0,
    };
  }

  return valorDevido(
    {
      baseCentavos: row.valor_centavos,
      vencimento: row.vencimento,
      multaPercent: row.leases?.multa_percent ?? 0,
      jurosMesPercent: row.leases?.juros_mes_percent ?? 0,
    },
    hoje,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("charges")
      .select("leases!inner(tenants!inner(nome))")
      .eq("id", id)
      .single();

    const inquilino =
      (data as unknown as { leases: { tenants: { nome: string } | null } | null } | null)
        ?.leases?.tenants?.nome ?? "Cobrança";

    return { title: `${inquilino} — Cobrança | JH Residências` };
  } catch {
    return { title: "Detalhe da cobrança — JH Residências" };
  }
}

export default async function CobrancaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const hoje = new Date();

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("charges")
    .select(
      "id, competencia, vencimento, valor_centavos, status, pix_copia_cola, link_pagamento, pago_em, leases!inner(multa_percent, juros_mes_percent, tenants!inner(nome), properties!inner(nome))",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const row = data as unknown as ChargeDetailRow;
  const valor = calcularValor(row, hoje);

  const charge: ChargeDetailData = {
    id: row.id,
    inquilino: row.leases?.tenants?.nome ?? "—",
    imovel: row.leases?.properties?.nome ?? "—",
    competencia: row.competencia,
    vencimento: row.vencimento,
    status: row.status,
    pixCopiaCola: row.pix_copia_cola,
    linkPagamento: row.link_pagamento,
    qrCodeBase64: null,
    pagoEm: row.pago_em,
    valor,
  };

  return (
    <AppShell title="Detalhe da cobrança" subtitle={charge.inquilino}>
      <Link
        href="/cobrancas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        {IconBack}
        Voltar
      </Link>

      <ChargeDetail charge={charge} />
    </AppShell>
  );
}
