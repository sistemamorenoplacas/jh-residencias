import "server-only";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Helpers de autenticação do admin (uso próprio do proprietário).
 *
 * A app tem um único usuário (o dono). Não há papéis nem multi-tenant: a
 * autorização é simplesmente "tem sessão Supabase válida". RLS no banco
 * garante o escopo por `owner_id = auth.uid()`.
 *
 * Server-only: nunca importe a partir de um arquivo `'use client'`.
 */

export interface SessionUser {
  id: string;
  email: string | null;
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

  return { id: data.user.id, email: data.user.email ?? null };
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
