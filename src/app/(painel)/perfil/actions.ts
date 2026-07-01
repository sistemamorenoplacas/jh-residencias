"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

export interface PerfilState {
  error: string | null;
  success: string | null;
}

const nomeSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres.").max(60),
});

const senhaSchema = z
  .object({
    senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As senhas não conferem.",
    path: ["confirmacao"],
  });

export async function atualizarNome(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const parsed = nomeSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.nome },
  });

  if (error) return { error: "Erro ao salvar nome. Tente novamente.", success: null };

  revalidatePath("/perfil");
  return { error: null, success: "Nome atualizado com sucesso." };
}

export async function atualizarSenha(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const parsed = senhaSchema.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });

  if (error) return { error: "Erro ao atualizar senha. Tente novamente.", success: null };

  return { error: null, success: "Senha atualizada com sucesso." };
}
