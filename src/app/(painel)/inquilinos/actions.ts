"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { DbTenant } from "@/lib/db-types";
import type { TenantFormState } from "./form-state";

/**
 * Server Actions do CRUD de inquilinos.
 *
 * Toda mutação:
 *  - exige sessão (`requireUser`) e escopa por `owner_id = auth.uid()`;
 *  - valida a entrada com zod (boundary do sistema), normalizando campos
 *    opcionais vazios para `null`;
 *  - usa o client SSR (RESPEITA RLS) — nunca o service role.
 *
 * O estado é devolvido no shape de `useActionState` (TenantFormState) para o
 * formulário exibir erros amigáveis. Em caso de sucesso, `revalidatePath`
 * atualiza a lista e o form fecha no client.
 */

/** E.164: "+" seguido de 7 a 15 dígitos, primeiro dígito não-zero. */
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/** CPF: exatamente 11 dígitos (já sem máscara). */
const CPF_REGEX = /^\d{11}$/;

/**
 * Trata strings vazias/whitespace de campos opcionais como ausência (`null`).
 * Mantém o resto trimado.
 */
function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

const tenantSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome do inquilino.")
    .max(120, "Nome muito longo."),
  telefone: z
    .string()
    .trim()
    .regex(E164_REGEX, "Telefone inválido. Use o formato +5511999998888."),
  email: z.preprocess(
    emptyToNull,
    z.string().email("E-mail inválido.").nullable(),
  ),
  cpf: z.preprocess((raw) => {
    const value = emptyToNull(raw);
    return value === null ? null : value.replace(/\D/g, "");
  }, z.string().regex(CPF_REGEX, "CPF deve ter 11 dígitos.").nullable()),
  // Endereço (opcional) — exigido só quando o boleto for gerado.
  cep: z.preprocess(
    (raw) => {
      const value = emptyToNull(raw);
      return value === null ? null : value.replace(/\D/g, "");
    },
    z
      .string()
      .regex(/^\d{8}$/, "CEP deve ter 8 dígitos.")
      .nullable(),
  ),
  logradouro: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  numero: z.preprocess(emptyToNull, z.string().max(20).nullable()),
  bairro: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  cidade: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  uf: z.preprocess(
    (raw) => {
      const value = emptyToNull(raw);
      return value === null ? null : value.toUpperCase();
    },
    z
      .string()
      .regex(/^[A-Z]{2}$/, "UF inválida (use 2 letras, ex.: SP).")
      .nullable(),
  ),
});

type TenantInput = z.infer<typeof tenantSchema>;

function parseTenantForm(
  formData: FormData,
): { ok: true; data: TenantInput } | { ok: false; error: string } {
  const parsed = tenantSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    cep: formData.get("cep"),
    logradouro: formData.get("logradouro"),
    numero: formData.get("numero"),
    bairro: formData.get("bairro"),
    cidade: formData.get("cidade"),
    uf: formData.get("uf"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Dados inválidos." };
  }

  return { ok: true, data: parsed.data };
}

/** Lê e valida o id do registro alvo de uma mutação. */
function requireId(formData: FormData): string | null {
  const raw = formData.get("id");
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Cria um inquilino. `owner_id` vem da sessão; o RLS garante o escopo.
 */
export async function criarInquilino(
  _prevState: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const user = await requireUser();
  const parsed = parseTenantForm(formData);

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("tenants").insert({
    owner_id: user.id,
    nome: parsed.data.nome,
    telefone: parsed.data.telefone,
    email: parsed.data.email,
    cpf: parsed.data.cpf,
    cep: parsed.data.cep,
    logradouro: parsed.data.logradouro,
    numero: parsed.data.numero,
    bairro: parsed.data.bairro,
    cidade: parsed.data.cidade,
    uf: parsed.data.uf,
  } satisfies Omit<DbTenant, "id" | "created_at">);

  if (error) {
    return { ok: false, error: "Não foi possível salvar o inquilino." };
  }

  revalidatePath("/inquilinos");
  return { ok: true, error: null };
}

/**
 * Atualiza um inquilino existente. A cláusula `eq("id", ...)` combinada com o
 * RLS (`owner_id = auth.uid()`) impede edição de registros de outro dono.
 */
export async function atualizarInquilino(
  _prevState: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  await requireUser();
  const id = requireId(formData);

  if (!id) {
    return { ok: false, error: "Registro inválido." };
  }

  const parsed = parseTenantForm(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email,
      cpf: parsed.data.cpf,
      cep: parsed.data.cep,
      logradouro: parsed.data.logradouro,
      numero: parsed.data.numero,
      bairro: parsed.data.bairro,
      cidade: parsed.data.cidade,
      uf: parsed.data.uf,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o inquilino." };
  }

  revalidatePath("/inquilinos");
  return { ok: true, error: null };
}

/**
 * Remove um inquilino. Falha de forma amigável quando há contratos
 * vinculados (FK), em vez de vazar a mensagem do banco.
 */
export async function excluirInquilino(
  _prevState: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  await requireUser();
  const id = requireId(formData);

  if (!id) {
    return { ok: false, error: "Registro inválido." };
  }

  const supabase = await createServerClient();

  // `leases.tenant_id` é ON DELETE RESTRICT: os contratos do inquilino precisam
  // sair antes (as cobranças vinculadas caem por CASCADE). Só então o inquilino
  // pode ser removido. Tudo escopado ao dono pelo RLS.
  const { error: leasesError } = await supabase
    .from("leases")
    .delete()
    .eq("tenant_id", id);

  if (leasesError) {
    return {
      ok: false,
      error: "Não foi possível excluir os contratos vinculados ao inquilino.",
    };
  }

  const { error } = await supabase.from("tenants").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível excluir o inquilino." };
  }

  revalidatePath("/inquilinos");
  revalidatePath("/contratos");
  revalidatePath("/cobrancas");
  return { ok: true, error: null };
}
