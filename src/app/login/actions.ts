"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Server Actions de autenticação.
 *
 * `signInWithPassword` valida a entrada com zod, autentica via Supabase (o
 * `@supabase/ssr` grava os cookies de sessão na resposta) e redireciona para
 * o destino solicitado. Erros de credencial viram mensagem amigável devolvida
 * ao formulário (consumida via `useActionState`).
 */

export interface LoginState {
  error: string | null;
}

const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

/**
 * Restringe o redirect pós-login a caminhos internos (evita open-redirect via
 * `?redirectTo=https://evil.com`). Só aceita paths absolutos que não comecem
 * com `//`.
 */
function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/painel";
}

export async function signInWithPassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos." };
  }

  const target = safeRedirectTarget(formData.get("redirectTo"));

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  redirect(target);
}

/**
 * Encerra a sessão e volta para `/login`.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export interface RecuperarState {
  ok: boolean | null;
  error: string | null;
}

const emailSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

/**
 * Envia o link de redefinição de senha via Supabase Auth.
 * Retorna sucesso mesmo quando o e-mail não existe (evita user-enumeration).
 */
export async function resetPassword(
  _prevState: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  }

  const supabase = await createServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login/nova-senha`,
  });

  return { ok: true, error: null };
}
