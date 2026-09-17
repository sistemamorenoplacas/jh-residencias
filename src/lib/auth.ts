import "server-only";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Helpers de autenticação do painel.
 *
 * Uma "conta" tem um proprietário (o `owner_id` de todos os registros) e pode
 * ter administradores adicionais (`account_members`, migration 0007). Todos os
 * administradores enxergam e operam os mesmos dados: o RLS compara `owner_id`
 * com `public.current_owner_id()`, e o app grava `owner_id = user.ownerId`.
 *
 * `ownerId` vem do claim `app_metadata.owner_id` (gravado ao convidar o
 * administrador); para o proprietário, é o próprio `id`.
 *
 * Server-only: nunca importe a partir de um arquivo `'use client'`.
 */

export interface SessionUser {
  id: string;
  email: string | null;
  /** Nome exibido (user_metadata.full_name), se cadastrado. */
  nome: string | null;
  /** `owner_id` dos dados que este usuário enxerga (ele mesmo ou o proprietário da conta). */
  ownerId: string;
}

/**
 * Retorna o usuário autenticado a partir dos cookies da request, ou `null`.
 *
 * Usa `getUser()` (valida o token contra o servidor Supabase) em vez de
 * `getSession()` (que confia no cookie), por ser a leitura segura recomendada
 * em Server Components / Server Actions.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const claimOwner = data.user.app_metadata?.owner_id;
  const fullName = data.user.user_metadata?.full_name;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    nome: typeof fullName === "string" && fullName.trim() ? fullName : null,
    ownerId: typeof claimOwner === "string" && claimOwner ? claimOwner : data.user.id,
  };
}

/**
 * Exige um usuário autenticado. Redireciona para `/login` se não houver
 * sessão. Use no topo de Server Components/layouts protegidos.
 *
 * O `redirect()` lança internamente, então o tipo de retorno é o usuário —
 * o caminho sem sessão nunca retorna.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}
