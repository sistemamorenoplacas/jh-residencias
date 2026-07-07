/**
 * Cron de geração mensal de cobranças (Fluxo A da arquitetura).
 *
 * `POST /api/cron/gerar-cobrancas` — protegido por `Authorization: Bearer
 * CRON_SECRET`. Acionado pelo Vercel Cron (`0 9 1 * *`).
 *
 * Passos:
 *   1. competência do mês corrente;
 *   2. lista contratos ativos (service role, sem RLS);
 *   3. planeja as cobranças (puro);
 *   4. insere de forma idempotente (unique lease_id+competencia);
 *   5. para cada charge NOVA: cria Pix no Mercado Pago, anexa dados de pagamento,
 *      envia o template de cobrança no WhatsApp e registra o envio em
 *      `whatsapp_messages`.
 *
 * Tolerância a falhas: cada charge nova é processada em try/catch isolado — uma
 * falha individual NÃO aborta o lote; os erros são coletados e devolvidos.
 *
 * Server-only: usa `serverEnv()` (secrets) e o client com SERVICE ROLE. Nunca
 * deve ser importado por código `'use client'`.
 */

import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { DbCharge, DbLease, WhatsappStatusDb } from "@/lib/db-types";
import {
  competenciaAtual,
  planejarCobrancasDoMes,
} from "@/lib/charge-generation";
import {
  inserirChargesIdempotente,
  listarLeasesAtivos,
  atualizarDadosPagamentoCharge,
  PAYER_EMAIL_FALLBACK,
} from "@/lib/charges-repo";
import { criarCobrancaPix } from "@/lib/mercadopago";
import { ownersComAutomacaoDesligada } from "@/lib/settings";
import { cobrancaAluguel } from "@/lib/whatsapp";
import { formatAmount } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";

export const runtime = "nodejs";
// Cron sempre executa em request-time; nunca deve ser pré-renderizado/cacheado.
export const dynamic = "force-dynamic";

/** Resposta agregada do cron. */
interface ResultadoCron {
  /** Quantidade de charges novas efetivamente criadas. */
  geradas: number;
  /** Quantas tiveram o template de cobrança enviado com sucesso. */
  enviadas: number;
  /** Erros por charge (não abortam o lote). */
  erros: string[];
}

/** Dados do inquilino necessários para a cobrança/mensagem. */
interface TenantDados {
  nome: string;
  telefone: string;
  email: string | null;
}

/**
 * Extrai a mensagem de um erro `unknown` de forma segura (sem `any`).
 */
function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : "erro desconhecido";
}

/**
 * Valida o header `Authorization: Bearer <CRON_SECRET>` em tempo constante
 * (`timingSafeEqual`), evitando vazamento de prefixo/comprimento por timing.
 */
function autorizado(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header) {
    return false;
  }
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return false;
  }
  const token = header.slice(prefix.length);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(serverEnv().CRON_SECRET);
  if (tokenBuf.length !== secretBuf.length) {
    return false;
  }
  return timingSafeEqual(tokenBuf, secretBuf);
}

/**
 * Busca os inquilinos dos leases informados, indexados por `lease_id`, para
 * montar a cobrança (email do pagador) e a mensagem (nome/telefone).
 */
async function buscarTenantsPorLease(
  leaseIds: ReadonlyArray<string>,
): Promise<Map<string, TenantDados>> {
  const mapa = new Map<string, TenantDados>();
  if (leaseIds.length === 0) {
    return mapa;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leases")
    .select("id, tenants!inner(nome, telefone, email)")
    .in("id", [...leaseIds]);

  if (error) {
    throw new Error(
      `falha ao buscar inquilinos dos contratos: ${error.message}`,
    );
  }

  interface TenantRel {
    nome: string;
    telefone: string;
    email: string | null;
  }
  interface Row {
    id: string;
    // O client tipa a relação embutida como array; normalizamos para 1 item.
    tenants: TenantRel | TenantRel[] | null;
  }

  for (const row of (data ?? []) as unknown as Row[]) {
    const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
    if (tenant) {
      mapa.set(row.id, {
        nome: tenant.nome,
        telefone: tenant.telefone,
        email: tenant.email,
      });
    }
  }

  return mapa;
}

/**
 * Registra o envio (ou tentativa) de um template em `whatsapp_messages`.
 * Best-effort: falha aqui não invalida a cobrança já criada/enviada, apenas é
 * propagada como erro do item pelo chamador.
 */
async function registrarMensagemWhatsapp(input: {
  ownerId: string;
  chargeId: string;
  tenantId: string;
  template: string;
  wamid: string | null;
  status: WhatsappStatusDb;
  erro: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("whatsapp_messages").insert({
    owner_id: input.ownerId,
    charge_id: input.chargeId,
    tenant_id: input.tenantId,
    template: input.template,
    wamid: input.wamid,
    status: input.status,
    erro: input.erro,
  });
  if (error) {
    throw new Error(`falha ao registrar whatsapp_messages: ${error.message}`);
  }
}

/**
 * Processa UMA charge nova: cria Pix, anexa dados, envia template e loga.
 * Lança em qualquer falha — o chamador isola em try/catch e segue o lote.
 */
async function processarCharge(
  charge: DbCharge,
  tenant: TenantDados,
  tenantId: string,
): Promise<void> {
  const payerEmail = tenant.email ?? PAYER_EMAIL_FALLBACK;

  const pix = await criarCobrancaPix({
    chargeId: charge.id,
    valorCentavos: charge.valor_centavos,
    vencimento: charge.vencimento,
    payerEmail,
  });

  await atualizarDadosPagamentoCharge(charge.id, {
    mpPaymentId: pix.mpPaymentId,
    pixCopiaCola: pix.pixCopiaCola,
    linkPagamento: pix.linkPagamento,
  });

  try {
    const { wamid } = await cobrancaAluguel({
      to: tenant.telefone,
      nome: tenant.nome,
      competencia: formatCompetencia(charge.competencia),
      valor: formatAmount(charge.valor_centavos),
      vencimento: formatData(charge.vencimento),
      chargeId: charge.id,
    });
    await registrarMensagemWhatsapp({
      ownerId: charge.owner_id,
      chargeId: charge.id,
      tenantId,
      template: "cobranca_aluguel",
      wamid,
      status: "enviado",
      erro: null,
    });
  } catch (error: unknown) {
    const erro = mensagemErro(error);
    // Loga a falha de envio para auditoria; depois propaga.
    await registrarMensagemWhatsapp({
      ownerId: charge.owner_id,
      chargeId: charge.id,
      tenantId,
      template: "cobranca_aluguel",
      wamid: null,
      status: "falhou",
      erro,
    });
    throw new Error(`envio WhatsApp falhou: ${erro}`);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const resultado: ResultadoCron = { geradas: 0, enviadas: 0, erros: [] };

  let novasCharges: DbCharge[];
  let leasesPorId: Map<string, DbLease>;
  let tenantsPorLease: Map<string, TenantDados>;

  try {
    const competencia = competenciaAtual(new Date());
    const todosLeases = await listarLeasesAtivos();
    // Pula donos que desligaram a cobrança automática nas Configurações.
    const desligados = await ownersComAutomacaoDesligada("cobranca_automatica");
    const leases = todosLeases.filter((l) => !desligados.has(l.owner_id));
    leasesPorId = new Map(leases.map((l) => [l.id, l]));

    const planos = planejarCobrancasDoMes(leases, competencia);
    const planosComOwner = planos.map((plano) => {
      const owner = leasesPorId.get(plano.leaseId)?.owner_id;
      if (!owner) {
        // Não deve ocorrer: o plano deriva dos próprios leases.
        throw new Error(`lease ${plano.leaseId} sem owner_id`);
      }
      return { ...plano, ownerId: owner };
    });

    novasCharges = await inserirChargesIdempotente(planosComOwner);
    resultado.geradas = novasCharges.length;

    const leaseIds = [...new Set(novasCharges.map((c) => c.lease_id))];
    tenantsPorLease = await buscarTenantsPorLease(leaseIds);
  } catch (error: unknown) {
    // Falha estrutural (auth já passou): aborta com 500 e o motivo.
    return NextResponse.json(
      { error: `Falha ao preparar o lote: ${mensagemErro(error)}` },
      { status: 500 },
    );
  }

  // A partir daqui, cada charge é isolada: uma falha não derruba o lote.
  for (const charge of novasCharges) {
    const tenant = tenantsPorLease.get(charge.lease_id);
    if (!tenant) {
      resultado.erros.push(
        `charge ${charge.id}: contrato ${charge.lease_id} sem inquilino vinculado`,
      );
      continue;
    }

    // Recupera o tenant_id para o log (join não trouxe o id; refazemos via lease->tenant).
    const tenantId = leasesPorId.get(charge.lease_id)?.tenant_id ?? null;
    if (!tenantId) {
      resultado.erros.push(
        `charge ${charge.id}: contrato ${charge.lease_id} sem tenant_id`,
      );
      continue;
    }

    try {
      await processarCharge(charge, tenant, tenantId);
      resultado.enviadas += 1;
    } catch (error: unknown) {
      resultado.erros.push(`charge ${charge.id}: ${mensagemErro(error)}`);
    }
  }

  return NextResponse.json(resultado, { status: 200 });
}
