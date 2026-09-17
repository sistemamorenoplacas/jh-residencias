"use server";

import { redirect } from "next/navigation";

import { isTipoConvite } from "@/lib/convite";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Ativa o convite de administrador: troca o token de uso único por uma sessão
 * (cookies) e manda o convidado criar a senha em `/login/nova-senha`.
 *
 * Roda só no clique do botão (POST) — nunca no GET da página — para que
 * pré-visualizações de link (WhatsApp etc.) não consumam o token.
 */
export async function ativarConvite(formData: FormData): Promise<void> {
  const tokenHash = formData.get("token_hash");
  const tipo = formData.get("type");

  if (typeof tokenHash !== "string" || !tokenHash || !isTipoConvite(tipo)) {
    redirect("/login/convite?erro=1");
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });

  if (error || !data.user) {
    redirect("/login/convite?erro=1");
  }

  // Marca o convite como aceito (service role: o convidado não tem policy de update).
  await createServiceClient()
    .from("account_members")
    .update({ aceito_em: new Date().toISOString() })
    .eq("user_id", data.user.id)
    .is("aceito_em", null);

  redirect("/login/nova-senha");
}
