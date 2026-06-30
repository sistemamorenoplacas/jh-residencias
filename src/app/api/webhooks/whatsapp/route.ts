/**
 * Webhook do WhatsApp Cloud API (Meta) — server-only.
 *
 * GET  — handshake de verificação (`hub.mode` / `hub.verify_token` / `hub.challenge`).
 *        Ecoa o `challenge` (200, text/plain) quando o token confere; senão 403.
 *
 * POST — recebimento de eventos. Valida a assinatura `X-Hub-Signature-256`
 *        contra o corpo CRU (HMAC-SHA256 com `WHATSAPP_APP_SECRET`); 401 se
 *        falhar. Extrai os `statuses[]` e atualiza `whatsapp_messages.status`
 *        pelo `wamid`, via service role (ignora RLS). Sempre 200 em sucesso —
 *        a Meta reentrega em qualquer resposta fora de 2xx.
 *
 * `runtime = "nodejs"` é obrigatório: precisamos do corpo CRU (`request.text()`)
 * intacto para o HMAC, e de `node:crypto` (usado por `validarXHubSignature`).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import {
  parseStatuses,
  validarXHubSignature,
  verificarWebhook,
  type StatusUpdate,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "x-hub-signature-256";

/**
 * GET: handshake de verificação do webhook (Meta).
 * Retorna o `challenge` em texto puro quando o token confere; senão 403.
 */
export function GET(request: NextRequest): NextResponse {
  const { searchParams } = new URL(request.url);

  const challenge = verificarWebhook({
    mode: searchParams.get("hub.mode"),
    token: searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
  });

  if (challenge === null) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * POST: eventos do webhook. Valida assinatura, extrai statuses e atualiza
 * `whatsapp_messages.status` pelo `wamid`. Sempre 200 em processamento OK.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Corpo CRU intacto: o HMAC precisa dos mesmos bytes que a Meta assinou.
  const rawBody = await request.text();

  const assinaturaValida = validarXHubSignature({
    rawBody,
    header: request.headers.get(SIGNATURE_HEADER),
  });

  if (!assinaturaValida) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch {
    // Assinatura válida mas JSON malformado: nada a processar. 200 para não
    // provocar reentrega de um payload que nunca vai fazer parse.
    return NextResponse.json({ ok: true, atualizados: 0 });
  }

  const atualizacoes = parseStatuses(payload);
  if (atualizacoes.length === 0) {
    // Eventos sem statuses (ex.: mensagens recebidas) são ignorados aqui.
    return NextResponse.json({ ok: true, atualizados: 0 });
  }

  const atualizados = await aplicarStatuses(atualizacoes);

  return NextResponse.json({ ok: true, atualizados });
}

/**
 * Atualiza `whatsapp_messages.status` para cada `wamid`. Usa service role
 * (sistema, sem usuário). Erros por linha são tolerados para não bloquear o
 * lote inteiro; retorna a contagem de linhas efetivamente atualizadas.
 */
async function aplicarStatuses(
  atualizacoes: readonly StatusUpdate[],
): Promise<number> {
  const supabase = createServiceClient();
  let atualizados = 0;

  for (const { wamid, status } of atualizacoes) {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .update({ status })
      .eq("wamid", wamid)
      .select("id");

    if (error) {
      // Tolera falha pontual (ex.: wamid ainda não registrado) sem abortar
      // o lote; a Meta reenviará statuses subsequentes se necessário.
      continue;
    }

    atualizados += data?.length ?? 0;
  }

  return atualizados;
}
