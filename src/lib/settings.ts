import "server-only";

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  suporteWhatsapp: "(31) 99999-9999",
  suporteEmail: "financeiro@jhresidencias.com.br",
  cobrancaAutomatica: true,
  lembretesAtivos: true,
};

interface DbSettingsRow {
  suporte_whatsapp: string | null;
  suporte_email: string | null;
  cobranca_automatica: boolean;
  lembretes_ativos: boolean;
}

function mapSettings(row: DbSettingsRow | null): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    suporteWhatsapp:
      row.suporte_whatsapp?.trim() || DEFAULT_SETTINGS.suporteWhatsapp,
    suporteEmail: row.suporte_email?.trim() || DEFAULT_SETTINGS.suporteEmail,
    cobrancaAutomatica: row.cobranca_automatica,
    lembretesAtivos: row.lembretes_ativos,
  };
}

const SELECT_COLS =
  "suporte_whatsapp, suporte_email, cobranca_automatica, lembretes_ativos";

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
