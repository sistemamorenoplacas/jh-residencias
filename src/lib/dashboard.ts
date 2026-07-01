import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { competenciaAtual } from "@/lib/charge-generation";
import type { ChargeStatusDb } from "@/lib/db-types";

/**
 * Tendências dos últimos 6 meses para os sparklines do painel.
 *
 * Server-only e escopado por RLS (usa `createServerClient`, ligado aos
 * cookies do request → `owner_id = auth.uid()`). Busca as charges das 6
 * competências mais recentes em uma única query e agrega em memória
 * (evita N+1 de uma query por mês).
 */

/** Quantidade de competências (meses) consideradas na tendência. */
const MESES_TENDENCIA = 6;

export interface Tendencias6Meses {
  /** % recebido sobre o total por mês, do mais antigo ao mais recente. */
  recebido: number[];
  /** % vencido (inadimplência) sobre o total por mês, do mais antigo ao mais recente. */
  inadimplencia: number[];
}

/** Tendências degradadas (zeros) para quando a leitura falhar. */
const TENDENCIAS_VAZIAS: Tendencias6Meses = {
  recebido: new Array(MESES_TENDENCIA).fill(0),
  inadimplencia: new Array(MESES_TENDENCIA).fill(0),
};

/** Garante 2 dígitos com zero à esquerda. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Lista as últimas `MESES_TENDENCIA` competências (`YYYY-MM-01`), da mais
 * antiga para a mais recente, retrocedendo a partir da competência atual.
 */
function ultimasCompetencias(competenciaBase: string, quantidade: number): string[] {
  const [anoStr, mesStr] = competenciaBase.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);

  const competencias: string[] = [];
  for (let i = quantidade - 1; i >= 0; i -= 1) {
    // Índice de mês absoluto (0-based) retrocedido em `i` meses.
    const indiceMesAbsoluto = ano * 12 + (mes - 1) - i;
    const anoAlvo = Math.floor(indiceMesAbsoluto / 12);
    const mesAlvo = (indiceMesAbsoluto % 12) + 1;
    competencias.push(`${anoAlvo}-${pad2(mesAlvo)}-01`);
  }
  return competencias;
}

interface ChargeAgregado {
  competencia: string;
  valor_centavos: number;
  status: ChargeStatusDb;
}

/** Acumulador por competência: total, pago e vencido em centavos. */
interface AcumuladorMes {
  total: number;
  pago: number;
  vencido: number;
}

function agregarPorCompetencia(
  charges: ChargeAgregado[],
  competencias: string[],
): Map<string, AcumuladorMes> {
  const acumuladores = new Map<string, AcumuladorMes>(
    competencias.map((c) => [c, { total: 0, pago: 0, vencido: 0 }]),
  );

  for (const charge of charges) {
    const acumulador = acumuladores.get(charge.competencia);
    if (!acumulador) {
      continue;
    }
    acumuladores.set(charge.competencia, {
      total: acumulador.total + charge.valor_centavos,
      pago: acumulador.pago + (charge.status === "pago" ? charge.valor_centavos : 0),
      vencido: acumulador.vencido + (charge.status === "vencido" ? charge.valor_centavos : 0),
    });
  }

  return acumuladores;
}

function paraPercentual(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

/**
 * Calcula as tendências de recebimento e inadimplência dos últimos 6 meses
 * (competências) do owner logado, para os sparklines dos MetricCards.
 *
 * Degrada para arrays de zeros em caso de erro de leitura (banco
 * indisponível / sessão expirada), sem derrubar a página — mesmo padrão de
 * `carregarCobrancasDoMes` no painel.
 */
export async function buscarTendencias6Meses(hoje: Date = new Date()): Promise<Tendencias6Meses> {
  try {
    const competencias = ultimasCompetencias(competenciaAtual(hoje), MESES_TENDENCIA);
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("charges")
      .select("competencia, valor_centavos, status")
      .in("competencia", competencias);

    if (error) {
      throw new Error(`Falha ao buscar tendências: ${error.message}`);
    }

    const charges = (data ?? []) as unknown as ChargeAgregado[];
    const acumuladores = agregarPorCompetencia(charges, competencias);

    const recebido: number[] = [];
    const inadimplencia: number[] = [];
    for (const competencia of competencias) {
      const acumulador = acumuladores.get(competencia) ?? { total: 0, pago: 0, vencido: 0 };
      recebido.push(paraPercentual(acumulador.pago, acumulador.total));
      inadimplencia.push(paraPercentual(acumulador.vencido, acumulador.total));
    }

    return { recebido, inadimplencia };
  } catch {
    return TENDENCIAS_VAZIAS;
  }
}
