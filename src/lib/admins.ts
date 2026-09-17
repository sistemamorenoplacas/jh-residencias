import "server-only";

import type { SessionUser } from "@/lib/auth";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

/** Administrador exibido em Configurações → Administradores. */
export interface AdminInfo {
  userId: string;
  nome: string;
  email: string;
  telefone: string | null;
  /** Proprietário da conta (não pode ser removido). */
  principal: boolean;
  /** Já ativou o convite e criou a senha. */
  ativo: boolean;
  /** É o usuário logado. */
  euMesmo: boolean;
}

interface MemberRow {
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  aceito_em: string | null;
  created_at: string;
}

/**
 * Lista o proprietário + administradores da conta do usuário logado.
 * Membros vêm de `account_members` (RLS: mesma conta); o proprietário, da
 * sessão ou do Auth Admin quando quem está logado é um membro.
 */
export async function listarAdministradores(user: SessionUser): Promise<AdminInfo[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("account_members")
    .select("user_id, nome, email, telefone, aceito_em, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao listar administradores: ${error.message}`);

  const principal = await carregarPrincipal(user);
  const membros = ((data ?? []) as MemberRow[]).map((m) => ({
    userId: m.user_id,
    nome: m.nome,
    email: m.email,
    telefone: m.telefone,
    principal: false,
    ativo: m.aceito_em !== null,
    euMesmo: m.user_id === user.id,
  }));

  return [principal, ...membros];
}

async function carregarPrincipal(user: SessionUser): Promise<AdminInfo> {
  if (user.id === user.ownerId) {
    return {
      userId: user.id,
      nome: user.nome ?? user.email?.split("@")[0] ?? "Proprietário",
      email: user.email ?? "",
      telefone: null,
      principal: true,
      ativo: true,
      euMesmo: true,
    };
  }

  const { data } = await createServiceClient().auth.admin.getUserById(user.ownerId);
  const owner = data.user;
  const fullName = owner?.user_metadata?.full_name;
  return {
    userId: user.ownerId,
    nome: typeof fullName === "string" && fullName ? fullName : owner?.email?.split("@")[0] ?? "Proprietário",
    email: owner?.email ?? "",
    telefone: null,
    principal: true,
    ativo: true,
    euMesmo: false,
  };
}
