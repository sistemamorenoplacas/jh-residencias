"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { parseBRLToCentavos } from "@/lib/money";

/**
 * Server Actions do CRUD de Contratos (leases).
 *
 * Cada action exige sessão (`requireUser`) e grava com o client RLS-aware
 * (`createServerClient`): as policies `owner_id = auth.uid()` garantem o
 * escopo por proprietário, então o `owner_id` é resolvido a partir da sessão,
 * nunca confiado a partir do formulário. Valores monetários trafegam em
 * centavos (inteiro); a UI envia a string BRL e convertemos na borda.
 */

export interface LeaseFormState {
  error: string | null;
  fieldErrors?: Partial<Record<LeaseField, string>>;
}

type LeaseField =
  | "propertyId"
  | "tenantId"
  | "valor"
  | "diaVencimento"
  | "multaPercent"
  | "jurosMesPercent"
  | "inicio"
  | "fim";

export const INITIAL_LEASE_STATE: LeaseFormState = { error: null };

const DIA_VENCIMENTO_MIN = 1;
const DIA_VENCIMENTO_MAX = 28;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Aceita "1.530,00" e devolve centavos; lança erro de validação amigável. */
function parseValorCentavos(raw: FormDataEntryValue | null): number {
  const text = typeof raw === "string" ? raw : "";
  const centavos = parseBRLToCentavos(text);
  if (!Number.isInteger(centavos) || centavos <= 0) {
    throw new Error("Informe um valor de aluguel maior que zero.");
  }
  return centavos;
}

const leaseSchema = z.object({
  propertyId: z.string().uuid("Selecione um imóvel."),
  tenantId: z.string().uuid("Selecione um inquilino."),
  diaVencimento: z.coerce
    .number()
    .int()
    .min(DIA_VENCIMENTO_MIN, `Dia entre ${DIA_VENCIMENTO_MIN} e ${DIA_VENCIMENTO_MAX}.`)
    .max(DIA_VENCIMENTO_MAX, `Dia entre ${DIA_VENCIMENTO_MIN} e ${DIA_VENCIMENTO_MAX}.`),
  multaPercent: z.coerce.number().min(0, "Multa não pode ser negativa.").max(100, "Multa inválida."),
  jurosMesPercent: z.coerce
    .number()
    .min(0, "Juros não pode ser negativo.")
    .max(100, "Juros inválido."),
  inicio: z.string().regex(ISO_DATE, "Informe a data de início."),
  fim: z
    .string()
    .regex(ISO_DATE, "Data de término inválida.")
    .nullable()
    .or(z.literal("").transform(() => null)),
  ativo: z.boolean(),
});

interface ParsedLease {
  ownerId: string;
  payload: {
    owner_id: string;
    property_id: string;
    tenant_id: string;
    valor_centavos: number;
    dia_vencimento: number;
    multa_percent: number;
    juros_mes_percent: number;
    inicio: string;
    fim: string | null;
    ativo: boolean;
  };
}

/** Lê o FormData, valida e monta o payload no shape do banco. */
async function readLeaseForm(formData: FormData): Promise<ParsedLease> {
  const user = await requireUser();

  const fimRaw = formData.get("fim");
  const parsed = leaseSchema.safeParse({
    propertyId: formData.get("propertyId"),
    tenantId: formData.get("tenantId"),
    diaVencimento: formData.get("diaVencimento"),
    multaPercent: formData.get("multaPercent"),
    jurosMesPercent: formData.get("jurosMesPercent"),
    inicio: formData.get("inicio"),
    fim: typeof fimRaw === "string" ? fimRaw : null,
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ValidationError(first?.message ?? "Dados inválidos.");
  }

  const valorCentavos = parseValorCentavos(formData.get("valor"));

  return {
    ownerId: user.id,
    payload: {
      owner_id: user.id,
      property_id: parsed.data.propertyId,
      tenant_id: parsed.data.tenantId,
      valor_centavos: valorCentavos,
      dia_vencimento: parsed.data.diaVencimento,
      multa_percent: parsed.data.multaPercent,
      juros_mes_percent: parsed.data.jurosMesPercent,
      inicio: parsed.data.inicio,
      fim: parsed.data.fim,
      ativo: parsed.data.ativo,
    },
  };
}

class ValidationError extends Error {}

function toState(error: unknown): LeaseFormState {
  if (error instanceof ValidationError) {
    return { error: error.message };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "Não foi possível salvar o contrato." };
}

export async function criarContrato(
  _prevState: LeaseFormState,
  formData: FormData,
): Promise<LeaseFormState> {
  let parsed: ParsedLease;
  try {
    parsed = await readLeaseForm(formData);
  } catch (error) {
    return toState(error);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("leases").insert(parsed.payload);

  if (error) {
    return { error: "Não foi possível criar o contrato." };
  }

  revalidatePath("/contratos");
  return { error: null };
}

export async function atualizarContrato(
  _prevState: LeaseFormState,
  formData: FormData,
): Promise<LeaseFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Contrato inválido." };
  }

  let parsed: ParsedLease;
  try {
    parsed = await readLeaseForm(formData);
  } catch (error) {
    return toState(error);
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("leases")
    .update(parsed.payload)
    .eq("id", id)
    .eq("owner_id", parsed.ownerId);

  if (error) {
    return { error: "Não foi possível atualizar o contrato." };
  }

  revalidatePath("/contratos");
  return { error: null };
}

/** Alterna o flag `ativo` do contrato (encerrar/reativar). */
export async function alternarAtivoContrato(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");
  const ativo = formData.get("ativo") === "true";
  if (typeof id !== "string" || !id) {
    return;
  }

  const supabase = await createServerClient();
  await supabase
    .from("leases")
    .update({ ativo: !ativo })
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath("/contratos");
}
