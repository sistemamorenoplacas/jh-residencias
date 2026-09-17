/**
 * Parâmetros de cobrança (parte pura, sem I/O): padrões, limites e o parser
 * dos marcos de lembrete digitados nas Configurações ("-3, 0, 1, 5").
 */

export const MULTA_PERCENT_PADRAO = 2.0;
export const JUROS_MES_PERCENT_PADRAO = 1.0;
export const CARENCIA_DIAS_PADRAO = 0;
/** Dias em relação ao vencimento (negativo = antes) em que o lembrete sai. */
export const LEMBRETE_MARCOS_PADRAO: readonly number[] = [-3, 0, 1, 5];

export const MARCO_MIN = -30;
export const MARCO_MAX = 60;

/**
 * "-3, 0, 1, 5" -> [-3, 0, 1, 5]. Aceita vírgula, ponto e vírgula ou espaço
 * como separador; ignora vazios; remove repetidos; ordena. Retorna `null`
 * quando algum valor não é inteiro dentro de [MARCO_MIN, MARCO_MAX].
 */
export function parseMarcos(texto: string): number[] | null {
  const partes = texto.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  const marcos = new Set<number>();
  for (const parte of partes) {
    if (!/^[+-]?\d+$/.test(parte)) return null;
    const n = Number(parte);
    if (n < MARCO_MIN || n > MARCO_MAX) return null;
    marcos.add(n);
  }
  return [...marcos].sort((a, b) => a - b);
}

/** [-3, 0, 1, 5] -> "-3, 0, 1, 5" (para preencher o campo). */
export function formatMarcos(marcos: readonly number[]): string {
  return marcos.join(", ");
}

/** Texto amigável: "3 dias antes, no dia, 1 dia depois, 5 dias depois". */
export function descreverMarcos(marcos: readonly number[]): string {
  if (marcos.length === 0) return "nenhum lembrete";
  return marcos
    .map((m) => {
      if (m === 0) return "no dia do vencimento";
      const abs = Math.abs(m);
      const dia = abs === 1 ? "1 dia" : `${abs} dias`;
      return m < 0 ? `${dia} antes` : `${dia} depois`;
    })
    .join(", ");
}
