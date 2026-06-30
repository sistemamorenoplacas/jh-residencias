"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { PropertyTipoDb } from "@/lib/db-types";

/**
 * Server Actions do CRUD de imóveis (properties).
 *
 * Toda mutação:
 *  - exige sessão (`requireUser`) e usa o cliente SSR (RESPEITA RLS), de modo
 *    que `owner_id = auth.uid()` é garantido tanto no insert (with check) quanto
 *    no update/delete (using);
 *  - valida a entrada com zod (boundary de sistema, nunca confiar no client);
 *  - revalida a rota `/imoveis` para refletir a lista atualizada.
 *
 * O estado de retorno segue o formato de `useActionState` (`{ error }`), com
 * `null` em caso de sucesso.
 */

export interface PropertyFormState {
  error: string | null;
}

const TIPOS = ["apartamento", "casa", "comercial"] as const satisfies readonly PropertyTipoDb[];

const propertyInputSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do imóvel.")
    .max(120, "Nome muito longo (máx. 120 caracteres)."),
  endereco: z
    .string()
    .trim()
    .min(1, "Informe o endereço.")
    .max(200, "Endereço muito longo (máx. 200 caracteres)."),
  tipo: z.enum(TIPOS, { message: "Selecione um tipo válido." }),
});

const idSchema = z.string().uuid("Imóvel inválido.");

function parsePropertyForm(
  formData: FormData,
): { ok: true; data: z.infer<typeof propertyInputSchema> } | { ok: false; error: string } {
  const parsed = propertyInputSchema.safeParse({
    nome: formData.get("nome"),
    endereco: formData.get("endereco"),
    tipo: formData.get("tipo"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Dados inválidos." };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Cria um imóvel pertencente ao usuário logado.
 */
export async function criarImovel(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();

  const parsed = parsePropertyForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from("properties").insert({
    owner_id: user.id,
    nome: parsed.data.nome,
    endereco: parsed.data.endereco,
    tipo: parsed.data.tipo,
  });

  if (error) {
    return { error: "Não foi possível salvar o imóvel. Tente novamente." };
  }

  revalidatePath("/imoveis");
  return { error: null };
}

/**
 * Edita um imóvel existente do usuário logado. A RLS impede alterar imóveis
 * de outro proprietário (a cláusula `using`/`with check` filtra por `owner_id`).
 */
export async function editarImovel(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return { error: "Imóvel inválido." };
  }

  const parsed = parsePropertyForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("properties")
    .update({
      nome: parsed.data.nome,
      endereco: parsed.data.endereco,
      tipo: parsed.data.tipo,
    })
    .eq("id", id.data);

  if (error) {
    return { error: "Não foi possível atualizar o imóvel. Tente novamente." };
  }

  revalidatePath("/imoveis");
  return { error: null };
}

/**
 * Exclui um imóvel do usuário logado. Recebe apenas o `id` via FormData
 * (formulário dedicado). A FK `leases.property_id` é `on delete restrict`, então
 * imóveis com contratos vinculados não podem ser apagados — o erro vira mensagem
 * amigável.
 */
export async function excluirImovel(formData: FormData): Promise<void> {
  await requireUser();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return;
  }

  const supabase = await createServerClient();
  await supabase.from("properties").delete().eq("id", id.data);

  revalidatePath("/imoveis");
}
