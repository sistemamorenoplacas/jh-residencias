import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { diasAtraso } from "@/lib/charges";
import { competenciaAtual } from "@/lib/charge-generation";
import type { ChargeRow, ChargeStatus } from "@/lib/types";
import type { ChargeStatusDb } from "@/lib/db-types";

/**
 * Leitura desnormalizada de cobranças para o painel.
 *
 * Server-only e escopado por RLS (usa `createServerClient`, ligado aos cookies
 * do request → `owner_id = auth.uid()`). Monta `ChargeRow[]` juntando
 * charges → leases → tenants/properties em uma única query aninhada do
 * Supabase, e calcula `diasAtraso` em runtime via `src/lib/charges.ts`.
 *
 * Reutilizado pelo dashboard (mês corrente) e pela lista de cobranças.
 */

/** Forma exata retornada pela query aninhada (apenas as colunas pedidas). */
interface ChargeJoinRow {
  id: string;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  status: ChargeStatusDb;
  lease: {
    tenant: { nome: string } | null;
    property: { nome: string } | null;
  } | null;
}

export interface BuscarChargeRowsFiltro {
  /** `YYYY-MM-01`. Quando omitido, não filtra por competência. */
  competencia?: string;
  /** Filtra por status. Quando omitido, retorna todos. */
  status?: ChargeStatus;
}

const SELECT_COBRANCAS = `
  id,
  competencia,
  vencimento,
  valor_centavos,
  status,
  lease:leases (
    tenant:tenants ( nome ),
    property:properties ( nome )
  )
` as const;

const SEM_INQUILINO = "Inquilino removido";
const SEM_IMOVEL = "Imóvel removido";

/** Normaliza relações 1:1 que o supabase-js às vezes tipa como array. */
function umRelacionado<T>(rel: T | T[] | null): T | null {
  if (Array.isArray(rel)) {
    return rel.length > 0 ? rel[0] : null;
  }
  return rel ?? null;
}

function paraChargeRow(row: ChargeJoinRow, hoje: Date): ChargeRow {
  const lease = umRelacionado(row.lease);
  const tenant = lease ? umRelacionado(lease.tenant) : null;
  const property = lease ? umRelacionado(lease.property) : null;

  const atraso =
    row.status === "pago" || row.status === "cancelado"
      ? 0
      : diasAtraso(row.vencimento, hoje);

  return {
    id: row.id,
    inquilino: tenant?.nome ?? SEM_INQUILINO,
    imovel: property?.nome ?? SEM_IMOVEL,
    competencia: row.competencia,
    vencimento: row.vencimento,
    valorCentavos: row.valor_centavos,
    status: row.status,
    diasAtraso: atraso,
  };
}

/**
 * Retorna as cobranças (desnormalizadas) do owner logado, ordenadas por
 * vencimento ascendente. Filtra opcionalmente por competência e/ou status.
 *
 * Lança `Error` em falha do banco — o caller (Server Component) trata o
 * fallback de UI.
 */
export async function buscarChargeRows(
  filtro: BuscarChargeRowsFiltro = {},
): Promise<ChargeRow[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from("charges")
    .select(SELECT_COBRANCAS)
    .order("vencimento", { ascending: true });

  if (filtro.competencia) {
    query = query.eq("competencia", filtro.competencia);
  }
  if (filtro.status) {
    query = query.eq("status", filtro.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao buscar cobranças: ${error.message}`);
  }

  const hoje = new Date();
  const linhas = (data ?? []) as unknown as ChargeJoinRow[];
  return linhas.map((row) => paraChargeRow(row, hoje));
}

/** Cobranças do mês corrente (competência = 1º dia do mês atual em UTC). */
export async function buscarChargeRowsDoMes(hoje: Date = new Date()): Promise<ChargeRow[]> {
  return buscarChargeRows({ competencia: competenciaAtual(hoje) });
}
