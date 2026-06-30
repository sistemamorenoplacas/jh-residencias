/**
 * Formatação monetária. Valores trafegam em centavos (inteiro) para evitar
 * erros de ponto flutuante; só viram string formatada na borda de exibição.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 153000 -> "R$ 1.530,00" */
export function formatBRL(centavos: number): string {
  return BRL.format(centavos / 100);
}

/** 153000 -> "1.530,00" (sem símbolo, para alinhar em colunas) */
export function formatAmount(centavos: number): string {
  return BRL.format(centavos / 100).replace(/^R\$\s?/, "");
}

/** "1.530,00" | "1530,00" | "1530.00" -> 153000 centavos */
export function parseBRLToCentavos(input: string): number {
  const normalized = input
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`Valor monetário inválido: "${input}"`);
  }
  return Math.round(value * 100);
}
