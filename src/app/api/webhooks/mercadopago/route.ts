/**
 * Webhook do Mercado Pago — notificações de pagamento.
 *
 * Fluxo (POST):
 *  1. Lê raw body + headers `x-signature` / `x-request-id` e query `type`/`data.id`.
 *  2. Valida a assinatura HMAC-SHA256 (`validarAssinaturaWebhook`) → 401 se falhar.
 *  3. Idempotência: insere em `webhook_events` (source `mercadopago`,
 *     event_id = `x-request-id`). Se já existe (unique violation 23505),
 *     responde 200 e sai — evento já processado.
 *  4. Reconsulta `GET /v1/payments/<data.id>` (fonte da verdade do status).
 *  5. `approved` → `confirmarPagamento` pela `charge` (external_reference) +
 *     (best-effort) notifica via WhatsApp. Demais status → `mapStatusMpToCharge`.
 *  6. Responde 200 rápido sempre (o MP reentrega em caso de não-2xx).
 *
 * RLS é ignorado: usa o client SERVICE ROLE (não há usuário autenticado aqui).
 * `runtime = "nodejs"` é obrigatório — a verificação de assinatura usa
 * `node:crypto` (em `validarAssinaturaWebhook`).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import {
  validarAssinaturaWebhook,
  consultarPagamento,
  mapStatusMpToCharge,
} from "@/lib/mercadopago";
import { confirmarPagamento, reverterPagamento } from "@/lib/charges-repo";
import { pagamentoConfirmado } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/money";
import { formatCompetencia } from "@/lib/dates";
import type {
  ChargeStatusDb,
  DbCharge,
  WhatsappStatusDb,
} from "@/lib/db-types";

export const runtime = "nodejs";
/** O MP não envia cookies; o handler é puramente server-to-server. */
export const dynamic = "force-dynamic";

/** Código de erro do Postgres para violação de unique constraint. */
const PG_UNIQUE_VIOLATION = "23505";

/** Status do MP que exigem reverter uma charge já paga (estorno/chargeback). */
const REVERSAL_STATUSES = new Set(["refunded", "charged_back"]);

/** Resposta padrão de sucesso — sempre 200 para o MP não reentregar. */
function ok(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Coleta de entradas (raw body + headers + query).
  const rawBody = await request.text();
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("type") ?? searchParams.get("topic");
  const dataId = extrairDataId(searchParams, rawBody);

  // 2) Validação de assinatura. Falha → 401 (não registramos o evento).
  const assinaturaOk = validarAssinaturaWebhook({
    xSignature,
    xRequestId,
    dataId,
  });
  if (!assinaturaOk) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  // Só tratamos notificações de pagamento. Outros tópicos: 200 e ignora.
  if (tipo !== null && tipo !== "payment") {
    return ok();
  }
  if (!dataId) {
    // Sem `data.id` não há o que consultar; reconhecemos para não reentregar.
    return ok();
  }

  // 3) Idempotência — registra o evento ANTES de processar.
  // event_id = x-request-id (garantido não-nulo pela validação de assinatura).
  const eventId = xRequestId as string;
  const supabase = createServiceClient();

  const { error: insertErr } = await supabase.from("webhook_events").insert({
    source: "mercadopago",
    event_id: eventId,
    payload: parseJsonSeguro(rawBody),
  });

  if (insertErr) {
    if (insertErr.code === PG_UNIQUE_VIOLATION) {
      // Já processado anteriormente → idempotente, responde 200 e sai.
      return ok();
    }
    // Falha inesperada ao registrar: peça reentrega (não-2xx).
    return NextResponse.json(
      { error: "falha ao registrar evento" },
      { status: 500 },
    );
  }

  // 4 + 5) Processa o pagamento. Encapsulado para sempre conseguir marcar
  // `processed_at` e responder 200 mesmo diante de erro de processamento.
  try {
    await processarPagamento(dataId);
  } catch {
    // Erro ao processar: removemos a linha recém-inserida em `webhook_events`
    // para não bloquear o reprocessamento (o dedupe na entrada responderia 200
    // ao reenvio) e respondemos 500 para o MP reentregar o evento.
    await supabase
      .from("webhook_events")
      .delete()
      .eq("source", "mercadopago")
      .eq("event_id", eventId);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }

  // Marca o evento como processado (best-effort; não bloqueia a resposta).
  await supabase
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("source", "mercadopago")
    .eq("event_id", eventId);

  return ok();
}

/**
 * Reconsulta o pagamento no MP e reflete o status na `charge` correspondente
 * (resolvida via `external_reference`). `approved` quita a charge e dispara a
 * confirmação por WhatsApp (best-effort).
 */
async function processarPagamento(mpPaymentId: string): Promise<void> {
  const consulta = await consultarPagamento(mpPaymentId);
  const chargeId = extrairExternalReference(consulta.raw);

  // Sem external_reference não há como reconciliar a charge — encerra.
  if (!chargeId) {
    return;
  }

  const novoStatus = mapStatusMpToCharge(consulta.status);

  if (novoStatus === "pago") {
    const { charge } = await confirmarPagamento(chargeId, {
      mpPaymentId: consulta.mpPaymentId,
      status: consulta.status,
      valorCentavos: consulta.valorCentavos,
      metodo: consulta.metodo,
      raw: consulta.raw,
    });
    await notificarPagamentoConfirmado(charge);
    return;
  }

  // Estorno/chargeback: precisa REGREDIR uma charge já 'pago' -> 'pendente'.
  // `atualizarStatusCharge` tem guarda `neq("status","pago")` e nunca reverteria.
  if (REVERSAL_STATUSES.has(consulta.status)) {
    await reverterPagamento(chargeId, {
      mpPaymentId: consulta.mpPaymentId,
      status: consulta.status,
      valorCentavos: consulta.valorCentavos,
      metodo: consulta.metodo,
      raw: consulta.raw,
    });
    return;
  }

  // Demais status: reflete na charge sem reabrir uma já paga.
  await atualizarStatusCharge(chargeId, novoStatus);
}

/**
 * Atualiza o status da charge para estados não-pagos (`pendente`/`cancelado`/
 * `vencido`). Nunca regride uma charge já `pago` (guarda `neq("status","pago")`).
 */
async function atualizarStatusCharge(
  chargeId: string,
  status: ChargeStatusDb,
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("charges")
    .update({ status })
    .eq("id", chargeId)
    .neq("status", "pago");
}

/**
 * Envia o template `pagamento_confirmado` ao inquilino. Best-effort:
 * qualquer falha (template não aprovado, número inválido, rede) é absorvida —
 * o pagamento já foi confirmado e não deve ser desfeito por isso. Registra a
 * tentativa em `whatsapp_messages` quando há `wamid`.
 */
async function notificarPagamentoConfirmado(charge: DbCharge): Promise<void> {
  const supabase = createServiceClient();

  // Resolve inquilino a partir da charge → lease → tenant.
  const { data: lease, error: leaseErr } = await supabase
    .from("leases")
    .select("tenant_id, tenants(id, nome, telefone)")
    .eq("id", charge.lease_id)
    .single();

  if (leaseErr || !lease) {
    return;
  }

  const tenant = extrairTenant(lease);
  if (!tenant) {
    return;
  }

  try {
    const { wamid } = await pagamentoConfirmado({
      to: tenant.telefone,
      nome: tenant.nome,
      competencia: formatCompetencia(charge.competencia),
      valor: formatBRL(charge.valor_centavos),
    });

    await registrarWhatsappMessage(charge, tenant.id, wamid, "enviado", null);
  } catch (erro) {
    await registrarWhatsappMessage(
      charge,
      tenant.id,
      null,
      "falhou",
      mensagemErro(erro),
    );
  }
}

/** Insere a linha de auditoria em `whatsapp_messages` (best-effort). */
async function registrarWhatsappMessage(
  charge: DbCharge,
  tenantId: string,
  wamid: string | null,
  status: WhatsappStatusDb,
  erro: string | null,
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("whatsapp_messages").insert({
    owner_id: charge.owner_id,
    charge_id: charge.id,
    tenant_id: tenantId,
    template: "pagamento_confirmado",
    wamid,
    status,
    erro,
  });
}

// ---------------------------------------------------------------------------
// Helpers de extração (tolerantes a payloads variados do MP)
// ---------------------------------------------------------------------------

interface TenantMin {
  id: string;
  nome: string;
  telefone: string;
}

/** Normaliza o join `leases(tenants(...))` — o PostgREST pode aninhar 1:1. */
function extrairTenant(lease: unknown): TenantMin | null {
  if (!isRecord(lease)) return null;
  const raw = lease.tenants;
  const tenant = Array.isArray(raw) ? raw[0] : raw;
  if (!isRecord(tenant)) return null;

  const id = stringDe(tenant.id);
  const nome = stringDe(tenant.nome);
  const telefone = stringDe(tenant.telefone);
  if (!id || !nome || !telefone) return null;

  return { id, nome, telefone };
}

/**
 * Resolve o `data.id` da query (`data.id` é o nome literal do parâmetro do MP)
 * com fallback para o corpo (`data.id` em `{ data: { id } }`).
 */
function extrairDataId(
  searchParams: URLSearchParams,
  rawBody: string,
): string | null {
  const fromQuery = searchParams.get("data.id") ?? searchParams.get("id");
  if (fromQuery) return fromQuery;

  const body = parseJsonSeguro(rawBody);
  if (isRecord(body)) {
    const data = body.data;
    if (isRecord(data)) {
      const id = stringDe(data.id);
      if (id) return id;
    }
    const direct = stringDe(body.id);
    if (direct) return direct;
  }
  return null;
}

/** Lê `external_reference` (= `charge.id`) do payload consultado. */
function extrairExternalReference(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  return stringDe(raw.external_reference);
}

function parseJsonSeguro(texto: string): unknown {
  if (!texto) return {};
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return {};
  }
}

function mensagemErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return "erro desconhecido ao notificar pagamento";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringDe(value: unknown): string | null {
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
