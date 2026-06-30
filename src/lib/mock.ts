/**
 * Dados de exemplo para desenvolver o painel antes da integração Supabase.
 * Substituídos por queries reais na Fase 2. NÃO usar em produção.
 */

import type { ChargeRow } from "./types";

export const MOCK_CHARGES: ChargeRow[] = [
  { id: "c1", inquilino: "Marina Couto", imovel: "Apto 302 — Ed. Aurora", competencia: "2026-06-01", vencimento: "2026-06-10", valorCentavos: 185000, status: "pago", diasAtraso: 0 },
  { id: "c2", inquilino: "Rafael Lima", imovel: "Casa 14 — Vila Sol", competencia: "2026-06-01", vencimento: "2026-06-05", valorCentavos: 240000, status: "vencido", diasAtraso: 19 },
  { id: "c3", inquilino: "Beatriz Nunes", imovel: "Sala 7 — Centro Empresarial", competencia: "2026-06-01", vencimento: "2026-06-15", valorCentavos: 320000, status: "pendente", diasAtraso: 0 },
  { id: "c4", inquilino: "Caio Ferreira", imovel: "Apto 51 — Ed. Mirante", competencia: "2026-06-01", vencimento: "2026-06-08", valorCentavos: 175000, status: "vencido", diasAtraso: 16 },
  { id: "c5", inquilino: "Helena Dias", imovel: "Kitnet 2 — Rua das Flores", competencia: "2026-06-01", vencimento: "2026-06-20", valorCentavos: 98000, status: "pendente", diasAtraso: 0 },
  { id: "c6", inquilino: "Otávio Brandão", imovel: "Loja 3 — Galeria Norte", competencia: "2026-06-01", vencimento: "2026-06-12", valorCentavos: 410000, status: "pago", diasAtraso: 0 },
];

export interface DashboardKpis {
  aReceberCentavos: number;
  recebidoCentavos: number;
  pendenteCentavos: number;
  inadimplenciaPct: number;
  recebidoPct: number;
}

export function computeKpis(rows: ChargeRow[]): DashboardKpis {
  const total = rows.reduce((s, r) => s + r.valorCentavos, 0);
  const recebido = rows.filter((r) => r.status === "pago").reduce((s, r) => s + r.valorCentavos, 0);
  const vencido = rows.filter((r) => r.status === "vencido").reduce((s, r) => s + r.valorCentavos, 0);
  const pendente = rows.filter((r) => r.status === "pendente").reduce((s, r) => s + r.valorCentavos, 0);
  return {
    aReceberCentavos: total,
    recebidoCentavos: recebido,
    pendenteCentavos: pendente + vencido,
    inadimplenciaPct: total === 0 ? 0 : Math.round((vencido / total) * 100),
    recebidoPct: total === 0 ? 0 : Math.round((recebido / total) * 100),
  };
}

/** Série pequena para sparklines dos KPIs (últimos 6 meses, ilustrativo). */
export const SPARK_RECEBIDO = [62, 58, 71, 65, 80, 74];
export const SPARK_INADIMPLENCIA = [12, 18, 9, 22, 15, 19];
