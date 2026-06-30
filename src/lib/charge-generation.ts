/**
 * Planejamento PURO de cobranças do mês.
 *
 * Funções determinísticas, sem I/O — testáveis isoladamente. Calculam, para
 * cada lease ativo, a competência, o valor-base e o vencimento. A persistência
 * (idempotente) fica em `charges-repo.ts`.
 *
 * Convenções: competência = 1º dia do mês (`YYYY-MM-01`); valores em centavos;
 * datas ISO `YYYY-MM-DD`. O dia de vencimento é truncado em 1..28 para evitar
 * meses curtos (igual à restrição do schema em `dia_vencimento`).
 */

import type { DbLease } from "@/lib/db-types";

/** Menor dia de vencimento permitido. */
const DIA_VENCIMENTO_MIN = 1;
/** Maior dia de vencimento permitido (fevereiro tem 28 dias garantidos). */
const DIA_VENCIMENTO_MAX = 28;

/** Plano de uma única cobrança a ser criada (ainda sem id/owner). */
export interface ChargePlan {
  leaseId: string;
  competencia: string; // YYYY-MM-01
  valorCentavos: number;
  vencimento: string; // YYYY-MM-DD
}

/** Garante 2 dígitos com zero à esquerda. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Trava `dia` no intervalo [1, 28]. */
function clampDiaVencimento(dia: number): number {
  if (dia < DIA_VENCIMENTO_MIN) {
    return DIA_VENCIMENTO_MIN;
  }
  if (dia > DIA_VENCIMENTO_MAX) {
    return DIA_VENCIMENTO_MAX;
  }
  return dia;
}

/**
 * Primeiro dia do mês corrente em ISO (`YYYY-MM-01`), baseado em UTC para ser
 * determinístico independente do timezone do servidor.
 */
export function competenciaAtual(hoje: Date): string {
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  return `${ano}-${pad2(mes)}-01`;
}

/**
 * Deriva o vencimento (`YYYY-MM-DD`) de uma competência aplicando o dia de
 * vencimento do contrato, truncado em 1..28.
 */
function vencimentoDaCompetencia(competencia: string, diaVencimento: number): string {
  const [ano, mes] = competencia.split("-");
  const dia = clampDiaVencimento(diaVencimento);
  return `${ano}-${mes}-${pad2(dia)}`;
}

/**
 * Planeja as cobranças do mês para os contratos ativos informados.
 *
 * PURA: não consulta o banco nem filtra por `ativo` (o repositório já entrega
 * só os ativos). Determinística para um mesmo conjunto de entradas.
 */
export function planejarCobrancasDoMes(
  leasesAtivos: ReadonlyArray<DbLease>,
  competencia: string,
): ChargePlan[] {
  return leasesAtivos.map((lease) => ({
    leaseId: lease.id,
    competencia,
    valorCentavos: lease.valor_centavos,
    vencimento: vencimentoDaCompetencia(competencia, lease.dia_vencimento),
  }));
}
