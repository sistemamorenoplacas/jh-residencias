import "server-only";

import {
  CARENCIA_DIAS_PADRAO,
  JUROS_MES_PERCENT_PADRAO,
  LEMBRETE_MARCOS_PADRAO,
  MULTA_PERCENT_PADRAO,
} from "@/lib/cobranca-params";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Configurações do admin (por dono). Lidas via service role — seguras em
 * páginas públicas de pagamento e nos crons. Se a linha não existir (ou a
 * tabela ainda não foi migrada), cai nos padrões, então nada quebra.
 */
export interface AppSettings {
  suporteWhatsapp: string;
  suporteEmail: string;
  cobrancaAutomatica: boolean;
  lembretesAtivos: boolean;
  /** Multa fixa sobre o valor (%) — padrão para contratos novos e para "aplicar a todos". */
  multaPercent: number;
  /** Juros ao mês (%), pró-rata por dia de atraso. */
  jurosMesPercent: number;
  /** Dias após o vencimento sem multa/juros. */
  carenciaDias: number;
  /** Dias em relação ao vencimento em que o lembrete sai (negativo = antes). */
  lembreteMarcos: number[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  suporteWhatsapp: "(31) 99999-9999",
  suporteEmail: "financeiro@jhresidencias.com.br",
  cobrancaAutomatica: true,
  lembretesAtivos: true,
  multaPercent: MULTA_PERCENT_PADRAO,
  jurosMesPercent: JUROS_MES_PERCENT_PADRAO,
  carenciaDias: CARENCIA_DIAS_PADRAO,
  lembreteMarcos: [...LEMBRETE_MARCOS_PADRAO],
};

interface DbSettingsRow {
  suporte_whatsapp: string | null;
  suporte_email: string | null;
  cobranca_automatica: boolean;
  lembretes_ativos: boolean;
  multa_percent: number | string | null;
  juros_mes_percent: number | string | null;
  carencia_dias: number | null;
  lembrete_marcos: number[] | null;
}

function numero(v: number | string | null | undefined, padrao: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : padrao;
}

function mapSettings(row: DbSettingsRow | null): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    suporteWhatsapp:
      row.suporte_whatsapp?.trim() || DEFAULT_SETTINGS.suporteWhatsapp,
    suporteEmail: row.suporte_email?.trim() || DEFAULT_SETTINGS.suporteEmail,
    cobrancaAutomatica: row.cobranca_automatica,
    lembretesAtivos: row.lembretes_ativos,
    multaPercent: numero(row.multa_percent, MULTA_PERCENT_PADRAO),
    jurosMesPercent: numero(row.juros_mes_percent, JUROS_MES_PERCENT_PADRAO),
    carenciaDias: numero(row.carencia_dias, CARENCIA_DIAS_PADRAO),
    lembreteMarcos: Array.isArray(row.lembrete_marcos)
      ? row.lembrete_marcos
      : [...LEMBRETE_MARCOS_PADRAO],
  };
}

const SELECT_COLS =
  "suporte_whatsapp, suporte_email, cobranca_automatica, lembretes_ativos, multa_percent, juros_mes_percent, carencia_dias, lembrete_marcos";

/** Configurações de um dono (com fallback para os padrões). */
export async function getSettings(ownerId: string): Promise<AppSettings> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select(SELECT_COLS)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return mapSettings((data as DbSettingsRow | null) ?? null);
}

/**
 * Conjunto de `owner_id` que DESLIGARAM um interruptor de automação. Usado
 * pelos crons para pular esses donos. `coluna` é `cobranca_automatica` ou
 * `lembretes_ativos`.
 */
export async function ownersComAutomacaoDesligada(
  coluna: "cobranca_automatica" | "lembretes_ativos",
): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select("owner_id")
    .eq(coluna, false);
  const rows = (data ?? []) as { owner_id: string }[];
  return new Set(rows.map((r) => r.owner_id));
}

/**
 * Marcos de lembrete por dono (só quem tem linha em `settings`; os demais
 * usam `LEMBRETE_MARCOS_PADRAO`). Usado pelo cron de lembretes.
 */
export async function marcosLembretePorOwner(): Promise<Map<string, number[]>> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("settings").select("owner_id, lembrete_marcos");
  const rows = (data ?? []) as { owner_id: string; lembrete_marcos: number[] | null }[];
  return new Map(
    rows.map((r) => [
      r.owner_id,
      Array.isArray(r.lembrete_marcos) ? r.lembrete_marcos : [...LEMBRETE_MARCOS_PADRAO],
    ]),
  );
}
