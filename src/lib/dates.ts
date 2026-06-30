/** Helpers de data. Entrada ISO (YYYY-MM-DD); saída pt-BR. */

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "2026-07-01" -> "Julho/2026" */
export function formatCompetencia(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return `${MESES[mes - 1]}/${ano}`;
}

/** "2026-07-10" -> "10/07" */
export function formatDiaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** "2026-07-10" -> "10/07/2026" */
export function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
