/**
 * Regra central de valor da cobrança.
 * No atraso aplica multa fixa + juros pró-rata die. Tudo em centavos (inteiro),
 * arredondamento half-up. Puro e determinístico — coberto por testes.
 */

export interface ValorParams {
  baseCentavos: number;
  vencimento: string; // YYYY-MM-DD
  multaPercent: number; // ex.: 2.0
  jurosMesPercent: number; // ex.: 1.0
}

export interface ValorDevido {
  baseCentavos: number;
  multaCentavos: number;
  jurosCentavos: number;
  totalCentavos: number;
  diasAtraso: number;
}

const MS_DIA = 86_400_000;
const DIAS_MES = 30;

/** half-up: 2.5 -> 3, -2.5 -> -2 */
function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5);
}

/** Dias inteiros de atraso (>= 0). Compara só a data, ignora hora/timezone. */
export function diasAtraso(vencimento: string, hoje: Date): number {
  const venc = Date.parse(`${vencimento}T00:00:00Z`);
  const ref = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  const dias = Math.floor((ref - venc) / MS_DIA);
  return dias > 0 ? dias : 0;
}

/** Valor total devido na data `hoje`, decompondo multa e juros. */
export function valorDevido(p: ValorParams, hoje: Date): ValorDevido {
  const dias = diasAtraso(p.vencimento, hoje);
  if (dias === 0) {
    return {
      baseCentavos: p.baseCentavos,
      multaCentavos: 0,
      jurosCentavos: 0,
      totalCentavos: p.baseCentavos,
      diasAtraso: 0,
    };
  }
  const multa = roundHalfUp((p.baseCentavos * p.multaPercent) / 100);
  const juros = roundHalfUp(
    (p.baseCentavos * (p.jurosMesPercent / 100) * dias) / DIAS_MES,
  );
  return {
    baseCentavos: p.baseCentavos,
    multaCentavos: multa,
    jurosCentavos: juros,
    totalCentavos: p.baseCentavos + multa + juros,
    diasAtraso: dias,
  };
}
