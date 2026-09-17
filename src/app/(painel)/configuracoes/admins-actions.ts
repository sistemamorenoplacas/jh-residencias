"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, type SessionUser } from "@/lib/auth";
import { resolveBaseUrl } from "@/lib/base-url";
import {
  mensagemConvite,
  montarLinkConvite,
  urlWhatsappConvite,
  type TipoConvite,
} from "@/lib/convite";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Administradores adicionais (Configurações → Administradores).
 *
 * Tudo aqui roda com service role porque cria/remove usuários no Auth e grava
 * em `account_members` (sem policies de escrita). A autorização é: quem chama
 * tem sessão, É O PROPRIETÁRIO da conta (membros convidados só veem a lista)
 * e o alvo pertence à mesma conta (`owner_id = user.ownerId`).
 *
 * O convite é um link de uso único gerado por `auth.admin.generateLink` —
 * não depende de e-mail: o link vai por WhatsApp e o convidado cria a senha
 * ao ativar (`/login/convite`).
 */

export interface ConviteState {
  ok: boolean;
  error: string | null;
  /** Preenchido após criar/gerar: para o botão do WhatsApp e "copiar link". */
  convite: { nome: string; link: string; whatsappUrl: string; mensagem: string } | null;
}

export const CONVITE_INITIAL_STATE: ConviteState = { ok: false, error: null, convite: null };

const ERRO_SO_PROPRIETARIO = "Apenas o proprietário da conta pode gerenciar administradores.";

/** Só o proprietário convida/remove; um convidado não pode escalar nem derrubar os outros. */
function souProprietario(user: SessionUser): boolean {
  return user.id === user.ownerId;
}

const novoAdminSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  telefone: z.string().trim().max(30),
});

/** Gera o link de uso único e monta o pacote de compartilhamento. */
async function montarConvite(
  email: string,
  nome: string,
  telefone: string | null,
  tipo: TipoConvite,
): Promise<{ convite: NonNullable<ConviteState["convite"]>; userId: string }> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: tipo,
    email,
    options: { data: { full_name: nome } },
  });
  if (error || !data.properties?.hashed_token || !data.user) {
    throw new Error(error?.message ?? "Não foi possível gerar o link.");
  }

  const link = montarLinkConvite(await resolveBaseUrl(), data.properties.hashed_token, tipo);
  const mensagem = mensagemConvite(nome, link);
  return {
    convite: { nome, link, mensagem, whatsappUrl: urlWhatsappConvite(telefone, mensagem) },
    userId: data.user.id,
  };
}

/** Cria o usuário no Auth, vincula à conta e devolve o convite para compartilhar. */
export async function convidarAdministrador(
  _prev: ConviteState,
  formData: FormData,
): Promise<ConviteState> {
  const user = await requireUser();
  if (!souProprietario(user)) {
    return { ok: false, error: ERRO_SO_PROPRIETARIO, convite: null };
  }
  const parsed = novoAdminSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", convite: null };
  }
  const { nome, email } = parsed.data;
  const telefone = parsed.data.telefone || null;

  try {
    // `invite` cria o usuário; se o e-mail já existe no Auth, não dá para saber
    // de quem é sem vazar informação — tratamos como "já cadastrado".
    const { convite, userId } = await montarConvite(email, nome, telefone, "invite");

    const service = createServiceClient();
    const { error: metaError } = await service.auth.admin.updateUserById(userId, {
      app_metadata: { owner_id: user.ownerId },
      user_metadata: { full_name: nome },
    });
    if (metaError) throw new Error(metaError.message);

    const { error: insertError } = await service.from("account_members").insert({
      user_id: userId,
      owner_id: user.ownerId,
      nome,
      email,
      telefone,
      convidado_por: user.id,
    });
    if (insertError) {
      await service.auth.admin.deleteUser(userId);
      throw new Error(insertError.message);
    }

    revalidatePath("/configuracoes");
    return { ok: true, error: null, convite };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const jaExiste = /already|registered|exists|duplicate/i.test(msg);
    return {
      ok: false,
      error: jaExiste
        ? "Já existe uma conta com este e-mail."
        : "Não foi possível criar o administrador. Tente novamente.",
      convite: null,
    };
  }
}

/** Gera um novo link (o anterior expira/é de uso único) para um convite pendente. */
export async function gerarLinkConvite(userId: string): Promise<ConviteState> {
  const user = await requireUser();
  if (!souProprietario(user)) {
    return { ok: false, error: ERRO_SO_PROPRIETARIO, convite: null };
  }
  const service = createServiceClient();
  const { data: membro } = await service
    .from("account_members")
    .select("user_id, nome, email, telefone, aceito_em")
    .eq("user_id", userId)
    .eq("owner_id", user.ownerId)
    .maybeSingle();
  if (!membro) {
    return { ok: false, error: "Administrador não encontrado.", convite: null };
  }

  try {
    const { convite } = await montarConvite(membro.email, membro.nome, membro.telefone, "magiclink");
    return { ok: true, error: null, convite };
  } catch {
    return { ok: false, error: "Não foi possível gerar o link. Tente novamente.", convite: null };
  }
}

/** Remove um administrador (usuário do Auth + vínculo). Nunca o proprietário nem a si mesmo. */
export async function removerAdministrador(userId: string): Promise<{ ok: boolean; error: string | null }> {
  const user = await requireUser();
  if (!souProprietario(user)) return { ok: false, error: ERRO_SO_PROPRIETARIO };
  if (userId === user.ownerId) return { ok: false, error: "O proprietário não pode ser removido." };
  if (userId === user.id) return { ok: false, error: "Você não pode remover a si mesmo." };

  const service = createServiceClient();
  const { data: membro } = await service
    .from("account_members")
    .select("user_id")
    .eq("user_id", userId)
    .eq("owner_id", user.ownerId)
    .maybeSingle();
  if (!membro) return { ok: false, error: "Administrador não encontrado." };

  // Apagar o usuário cascateia em account_members (FK on delete cascade).
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "Não foi possível remover. Tente novamente." };

  revalidatePath("/configuracoes");
  return { ok: true, error: null };
}
