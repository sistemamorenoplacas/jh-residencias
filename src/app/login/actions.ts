"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
    redirectTo: `${await resolveBaseUrl()}/login/nova-senha`,
  });

  return { ok: true, error: null };
}

/**
 * Resolve a URL base do app para montar links de redirect (ex.: e-mail de
 * recuperação de senha). Deriva do header `origin`/`host` da própria
 * requisição (robusto em qualquer ambiente: local, preview, produção), com
 * fallback para `APP_BASE_URL` quando o header não estiver disponível.
 */
async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();

  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? "https";
    return `${protocol}://${host}`;
  }

  return process.env.APP_BASE_URL ?? "";
}

export interface NovaSenhaState {
  ok: boolean | null;
  error: string | null;
}

const novaSenhaSchema = z
  .object({
    senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não conferem.",
    path: ["confirmar"],
  });

/**
 * Define a nova senha durante o fluxo de recuperação. Quando o usuário chega
 * pelo link do e-mail do Supabase, a sessão de recuperação já está presente
 * nos cookies (trocada pelo middleware/callback do `@supabase/ssr`), então
 * basta chamar `updateUser` com o client autenticado do request.
 */
export async function atualizarSenhaRecuperacao(
  _prevState: NovaSenhaState,
  formData: FormData,
): Promise<NovaSenhaState> {
  const parsed = novaSenhaSchema.safeParse({
    senha: formData.get("senha"),
    confirmar: formData.get("confirmar"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });

  if (error) {
    return {
      ok: false,
      error: "O link expirou ou é inválido. Solicite um novo.",
    };
  }

  return { ok: true, error: null };
}
