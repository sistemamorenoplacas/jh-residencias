"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { parseMarcos } from "@/lib/cobranca-params";
import { createServerClient } from "@/lib/supabase/server";
import type { ConfigFormState } from "./form-state";

const emailOpcional = z
  .string()
  .trim()
  .max(120)
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "E-mail inválido.",
  );

const percentual = (rotulo: string) =>
  z.coerce
    .number({ message: `${rotulo}: informe um número.` })
    .min(0, `${rotulo}: não pode ser negativo.`)
    .max(20, `${rotulo}: no máximo 20%.`);

const schema = z.object({
  suporteWhatsapp: z.string().trim().max(40),
  suporteEmail: emailOpcional,
  cobrancaAutomatica: z.boolean(),
  lembretesAtivos: z.boolean(),
  multaPercent: percentual("Multa"),
  jurosMesPercent: percentual("Juros ao mês"),
  carenciaDias: z.coerce
    .number({ message: "Carência: informe um número de dias." })
    .int("Carência: use dias inteiros.")
    .min(0, "Carência: não pode ser negativa.")
    .max(30, "Carência: no máximo 30 dias."),
  lembreteMarcos: z
    .string()
    .transform((texto, ctx) => {
      const marcos = parseMarcos(texto);
      if (marcos === null) {
        ctx.addIssue({
          code: "custom",
          message: "Lembretes: use dias inteiros entre -30 e 60, separados por vírgula (ex.: -3, 0, 1, 5).",
        });
        return z.NEVER;
      }
      return marcos;
    }),
});

/**
 * Salva as configurações do admin (contato de suporte + interruptores da
 * automação). Upsert por `owner_id` — RLS garante o escopo do dono.
 */
export async function salvarConfiguracoes(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    suporteWhatsapp: String(formData.get("suporteWhatsapp") ?? ""),
    suporteEmail: String(formData.get("suporteEmail") ?? ""),
    cobrancaAutomatica: formData.get("cobrancaAutomatica") === "on",
    lembretesAtivos: formData.get("lembretesAtivos") === "on",
    multaPercent: String(formData.get("multaPercent") ?? "").replace(",", "."),
    jurosMesPercent: String(formData.get("jurosMesPercent") ?? "").replace(",", "."),
    carenciaDias: String(formData.get("carenciaDias") ?? "0"),
    lembreteMarcos: String(formData.get("lembreteMarcos") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      saved: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("settings").upsert(
    {
      owner_id: user.ownerId,
      suporte_whatsapp: parsed.data.suporteWhatsapp || null,
      suporte_email: parsed.data.suporteEmail || null,
      cobranca_automatica: parsed.data.cobrancaAutomatica,
      lembretes_ativos: parsed.data.lembretesAtivos,
      multa_percent: parsed.data.multaPercent,
      juros_mes_percent: parsed.data.jurosMesPercent,
      carencia_dias: parsed.data.carenciaDias,
      lembrete_marcos: parsed.data.lembreteMarcos,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );

  if (error) {
    return {
      ok: false,
      saved: false,
      error: "Não foi possível salvar as configurações.",
    };
  }

  revalidatePath("/configuracoes");
  return { ok: true, saved: true, error: null };
}

export interface AplicarTaxasState {
  ok: boolean;
  error: string | null;
  /** Quantos contratos ativos foram atualizados. */
  atualizados: number;
}

/**
 * Copia a multa e os juros das Configurações para TODOS os contratos ativos
 * da conta (os contratos guardam as próprias taxas — assim quem tem acordo
 * diferente continua podendo editar o contrato depois).
 */
export async function aplicarTaxasAosContratos(): Promise<AplicarTaxasState> {
  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: cfg } = await supabase
    .from("settings")
    .select("multa_percent, juros_mes_percent")
    .eq("owner_id", user.ownerId)
    .maybeSingle();
  if (!cfg) {
    return { ok: false, error: "Salve as configurações antes de aplicar.", atualizados: 0 };
  }

  const { data, error } = await supabase
    .from("leases")
    .update({ multa_percent: cfg.multa_percent, juros_mes_percent: cfg.juros_mes_percent })
    .eq("owner_id", user.ownerId)
    .eq("ativo", true)
    .select("id");

  if (error) {
    return { ok: false, error: "Não foi possível atualizar os contratos.", atualizados: 0 };
  }

  revalidatePath("/contratos");
  revalidatePath("/cobrancas");
  return { ok: true, error: null, atualizados: data?.length ?? 0 };
}
