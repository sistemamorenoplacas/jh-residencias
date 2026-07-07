"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export interface ConfigFormState {
  ok: boolean;
  error: string | null;
  /** True logo após um salvamento bem-sucedido (para feedback no form). */
  saved: boolean;
}

export const CONFIG_FORM_INITIAL_STATE: ConfigFormState = {
  ok: false,
  error: null,
  saved: false,
};

const emailOpcional = z
  .string()
  .trim()
  .max(120)
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "E-mail inválido.",
  );

const schema = z.object({
  suporteWhatsapp: z.string().trim().max(40),
  suporteEmail: emailOpcional,
  cobrancaAutomatica: z.boolean(),
  lembretesAtivos: z.boolean(),
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
      owner_id: user.id,
      suporte_whatsapp: parsed.data.suporteWhatsapp || null,
      suporte_email: parsed.data.suporteEmail || null,
      cobranca_automatica: parsed.data.cobrancaAutomatica,
      lembretes_ativos: parsed.data.lembretesAtivos,
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
