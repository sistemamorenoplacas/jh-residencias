import "server-only";

import { createServerClient } from "@/lib/supabase/server";

/** Resumo das aberturas do link de pagamento de uma cobrança. */
export interface AberturasLink {
  total: number;
  /** ISO da primeira e da última abertura. */
  primeiraEm: string;
  ultimaEm: string;
}

/**
 * Aberturas por cobrança (client SSR → RLS da conta). Devolve só as que têm
 * pelo menos uma abertura. Tolera a tabela ainda não migrada (mapa vazio).
 */
export async function aberturasPorCharge(
  chargeIds: readonly string[],
): Promise<Map<string, AberturasLink>> {
  const mapa = new Map<string, AberturasLink>();
  const ids = [...new Set(chargeIds.filter(Boolean))];
  if (ids.length === 0) return mapa;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("charge_link_views")
    .select("charge_id, created_at")
    .in("charge_id", ids)
    .order("created_at", { ascending: true });
  if (error || !data) return mapa;

  for (const row of data as { charge_id: string; created_at: string }[]) {
    const atual = mapa.get(row.charge_id);
    if (!atual) {
      mapa.set(row.charge_id, { total: 1, primeiraEm: row.created_at, ultimaEm: row.created_at });
    } else {
      atual.total += 1;
      atual.ultimaEm = row.created_at;
    }
  }
  return mapa;
}

/** "17/09 14:32" — curto, para selos e listas. */
export function formatQuando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(iso))
    .replace(",", "");
}
