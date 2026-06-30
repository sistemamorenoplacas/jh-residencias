import "server-only";

/**
 * Repositório server-only de `charges` (e tabelas adjacentes para o fluxo de
 * cobrança/lembrete). Usa o client com SERVICE ROLE — ignora RLS — porque roda
 * em cron e webhooks, onde não há usuário autenticado.
 *
 * Idempotência: a inserção respeita a unique `(lease_id, competencia)` via
 * upsert com `ignoreDuplicates`, devolvendo apenas as linhas novas.
 *
 * Convenções: valores em centavos; datas ISO `YYYY-MM-DD`; competência no 1º
 * dia do mês. Todo retorno é tipado pelos `Db*` de `db-types.ts`.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type {
  ChargeStatusDb,
  DbCharge,
  DbLease,
  DbPayment,
} from "@/lib/db-types";
import type { ChargePlan } from "@/lib/charge-generation";

/** E-mail placeholder do pagador quando o inquilino não tem e-mail cadastrado. */
export const PAYER_EMAIL_FALLBACK = "sem-email@jh-residencias.local";

/** Marcos de lembrete relativos ao vencimento, em dias (negativo = antes). */
const MARCOS_LEMBRETE_DIAS = [-3, 0, 1, 5] as const;

const MS_DIA = 86_400_000;

/** Dados achatados de uma charge candidata a lembrete + contexto. */
export interface ChargeLembrete {
  charge: DbCharge;
  tenant: {
    id: string;
    nome: string;
    telefone: string;
  };
  lease: {
    id: string;
    multaPercent: number;
    jurosMesPercent: number;
  };
  /** Quantos dias o vencimento dista de hoje (negativo = vence no futuro). */
  marcoDias: number;
}

/** Dados de pagamento para gravar ao confirmar a quitação de uma charge. */
export interface PaymentInput {
  mpPaymentId: string;
  status: string;
  valorCentavos: number;
  metodo: string;
  raw: unknown;
}

/** Dados de pagamento (PIX/link) anexados a uma charge após criar a preferência. */
export interface DadosPagamentoCharge {
  mpPaymentId?: string | null;
  mpPreferenceId?: string | null;
  pixCopiaCola?: string | null;
  linkPagamento?: string | null;
}

/** Erro de domínio do repositório, com a mensagem original do Postgres. */
export class ChargesRepoError extends Error {
  constructor(operacao: string, detalhe: string) {
    super(`charges-repo: ${operacao} falhou: ${detalhe}`);
    this.name = "ChargesRepoError";
  }
}

/** Aplica deslocamento de dias a uma data ISO, retornando outra data ISO (UTC). */
function deslocarDataIso(iso: string, dias: number): string {
  const base = Date.parse(`${iso}T00:00:00Z`);
  const alvo = new Date(base + dias * MS_DIA);
  const ano = alvo.getUTCFullYear();
  const mes = alvo.getUTCMonth() + 1;
  const dia = alvo.getUTCDate();
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Início do dia (UTC) de uma data ISO em ms, p/ comparar só a data. */
function diaUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** `hoje` (Date) -> data ISO `YYYY-MM-DD` em UTC. */
function hojeIso(hoje: Date): string {
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;
  const dia = hoje.getUTCDate();
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/**
 * Lista contratos ativos. Opcionalmente escopado a um `ownerId` (sem ele,
 * traz de todos os owners — uso de cron global).
 */
export async function listarLeasesAtivos(ownerId?: string): Promise<DbLease[]> {
  const supabase = createServiceClient();
  let query = supabase.from("leases").select("*").eq("ativo", true);
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query;
  if (error) {
    throw new ChargesRepoError("listarLeasesAtivos", error.message);
  }
  return (data ?? []) as DbLease[];
}

/**
 * Insere as charges planejadas de forma idempotente. Usa upsert com
 * `onConflict: "lease_id,competencia"` e `ignoreDuplicates: true`, devolvendo
 * SOMENTE as linhas efetivamente criadas (as duplicadas não voltam).
 *
 * Cada plano precisa do `ownerId` resolvido pelo chamador (o plano puro não o
 * carrega). Status inicial sempre `pendente`.
 */
export async function inserirChargesIdempotente(
  charges: ReadonlyArray<ChargePlan & { ownerId: string }>,
): Promise<DbCharge[]> {
  if (charges.length === 0) {
    return [];
  }

  const supabase = createServiceClient();
  const rows = charges.map((c) => ({
    owner_id: c.ownerId,
    lease_id: c.leaseId,
    competencia: c.competencia,
    valor_centavos: c.valorCentavos,
    vencimento: c.vencimento,
    status: "pendente" satisfies ChargeStatusDb,
  }));

  const { data, error } = await supabase
    .from("charges")
    .upsert(rows, {
      onConflict: "lease_id,competencia",
      ignoreDuplicates: true,
    })
    .select("*");

  if (error) {
    throw new ChargesRepoError("inserirChargesIdempotente", error.message);
  }
  return (data ?? []) as DbCharge[];
}

/**
 * Anexa dados de pagamento (id MP, preferência, PIX copia-e-cola, link) a uma
 * charge — tipicamente após criar a preferência no Mercado Pago. Só grava os
 * campos informados (undefined é ignorado).
 */
export async function atualizarDadosPagamentoCharge(
  chargeId: string,
  dados: DadosPagamentoCharge,
): Promise<DbCharge> {
  const patch: Record<string, string | null> = {};
  if (dados.mpPaymentId !== undefined) {
    patch.mp_payment_id = dados.mpPaymentId;
  }
  if (dados.mpPreferenceId !== undefined) {
    patch.mp_preference_id = dados.mpPreferenceId;
  }
  if (dados.pixCopiaCola !== undefined) {
    patch.pix_copia_cola = dados.pixCopiaCola;
  }
  if (dados.linkPagamento !== undefined) {
    patch.link_pagamento = dados.linkPagamento;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("charges")
    .update(patch)
    .eq("id", chargeId)
    .select("*")
    .single();

  if (error) {
    throw new ChargesRepoError("atualizarDadosPagamentoCharge", error.message);
  }
  return data as DbCharge;
}

/**
 * Marca como `vencido` toda charge ainda `pendente` cujo vencimento já passou
 * (`vencimento < hoje`). Retorna as charges atualizadas.
 */
export async function marcarChargesVencidas(hoje: Date): Promise<DbCharge[]> {
  const supabase = createServiceClient();
  const hojeStr = hojeIso(hoje);

  const { data, error } = await supabase
    .from("charges")
    .update({ status: "vencido" satisfies ChargeStatusDb })
    .eq("status", "pendente")
    .lt("vencimento", hojeStr)
    .select("*");

  if (error) {
    throw new ChargesRepoError("marcarChargesVencidas", error.message);
  }
  return (data ?? []) as DbCharge[];
}

/** Shape da linha retornada pelo join de charges -> leases -> tenants. */
interface ChargeLembreteRow extends DbCharge {
  leases: {
    id: string;
    multa_percent: number;
    juros_mes_percent: number;
    tenants: {
      id: string;
      nome: string;
      telefone: string;
    } | null;
  } | null;
}

/**
 * Busca charges em aberto (`pendente`/`vencido`) cujo vencimento cai em um dos
 * marcos de lembrete relativos a `hoje` (D-3, D0, D+1, D+5), já com os dados do
 * inquilino e do contrato necessários para montar a mensagem.
 */
export async function buscarChargesParaLembrete(
  hoje: Date,
): Promise<ChargeLembrete[]> {
  const supabase = createServiceClient();
  const hojeStr = hojeIso(hoje);

  // Datas-alvo: vencimento = hoje + (-marco). D-3 => vence em hoje+3, etc.
  const vencimentosAlvo = MARCOS_LEMBRETE_DIAS.map((marco) =>
    deslocarDataIso(hojeStr, -marco),
  );

  const { data, error } = await supabase
    .from("charges")
    .select(
      "*, leases!inner(id, multa_percent, juros_mes_percent, tenants!inner(id, nome, telefone))",
    )
    .in("status", ["pendente", "vencido"] satisfies ChargeStatusDb[])
    .in("vencimento", vencimentosAlvo);

  if (error) {
    throw new ChargesRepoError("buscarChargesParaLembrete", error.message);
  }

  const rows = (data ?? []) as ChargeLembreteRow[];
  const lembretes: ChargeLembrete[] = [];

  for (const row of rows) {
    const lease = row.leases;
    const tenant = lease?.tenants;
    if (!lease || !tenant) {
      // join inner deveria garantir presença; pulamos defensivamente.
      continue;
    }

    const { leases: _leases, ...charge } = row;
    const diffDias = Math.round(
      (diaUtcMs(charge.vencimento) - diaUtcMs(hojeStr)) / MS_DIA,
    );

    lembretes.push({
      charge: charge as DbCharge,
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        telefone: tenant.telefone,
      },
      lease: {
        id: lease.id,
        multaPercent: lease.multa_percent,
        jurosMesPercent: lease.juros_mes_percent,
      },
      marcoDias: diffDias,
    });
  }

  return lembretes;
}

/**
 * Confirma o pagamento de uma charge: marca como `pago` com `pago_em = now` e
 * registra a linha de auditoria em `payments`. Idempotente quanto ao status —
 * só transiciona charges que ainda não estão pagas (`status != "pago"`); se
 * outra confirmação já a marcou, retorna a charge atual sem reinserir payment.
 *
 * Não há transação multi-statement no PostgREST; a idempotência é garantida em
 * camadas: dedupe na entrada do webhook (`webhook_events`), guarda de status no
 * UPDATE (evita dupla-marcação concorrente) e a unique `(mp_payment_id, status)`
 * em `payments`, cuja violação (23505) é tratada como no-op idempotente.
 */
export async function confirmarPagamento(
  chargeId: string,
  pagamento: PaymentInput,
): Promise<{ charge: DbCharge; payment: DbPayment | null }> {
  const supabase = createServiceClient();
  const agora = new Date().toISOString();

  /** Código do Postgres para violação de unique (pagamento já auditado). */
  const PG_UNIQUE_VIOLATION = "23505";

  // 1) Transição condicional: só atualiza se ainda não estava paga.
  const { data: charges, error: updErr } = await supabase
    .from("charges")
    .update({
      status: "pago" satisfies ChargeStatusDb,
      pago_em: agora,
      mp_payment_id: pagamento.mpPaymentId,
    })
    .eq("id", chargeId)
    .neq("status", "pago")
    .select("*");

  if (updErr) {
    throw new ChargesRepoError("confirmarPagamento(update)", updErr.message);
  }

  // Já estava paga: busca o estado atual e retorna sem reinserir payment.
  if (!charges || charges.length === 0) {
    const { data: atual, error: selErr } = await supabase
      .from("charges")
      .select("*")
      .eq("id", chargeId)
      .single();
    if (selErr) {
      throw new ChargesRepoError("confirmarPagamento(select)", selErr.message);
    }
    return { charge: atual as DbCharge, payment: null };
  }

  const charge = charges[0] as DbCharge;

  // 2) Registra o pagamento (auditoria). owner_id herdado da charge.
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      owner_id: charge.owner_id,
      charge_id: charge.id,
      mp_payment_id: pagamento.mpPaymentId,
      status: pagamento.status,
      valor_centavos: pagamento.valorCentavos,
      metodo: pagamento.metodo,
      raw: pagamento.raw,
    })
    .select("*")
    .single();

  if (payErr) {
    // Pagamento já auditado (reentrega do webhook): trata como idempotente.
    if (payErr.code === PG_UNIQUE_VIOLATION) {
      return { charge, payment: null };
    }
    throw new ChargesRepoError("confirmarPagamento(payment)", payErr.message);
  }

  return { charge, payment: payment as DbPayment };
}

/**
 * Reverte uma charge paga após estorno/chargeback do MP: status -> 'pendente',
 * pago_em -> null, e registra a linha de auditoria em `payments`. Diferente de
 * `confirmarPagamento`, NÃO usa guarda de status (precisa regredir de 'pago').
 * Idempotente quanto ao payment (trata 23505 como no-op).
 */
export async function reverterPagamento(
  chargeId: string,
  pagamento: PaymentInput,
): Promise<{ charge: DbCharge | null; payment: DbPayment | null }> {
  const supabase = createServiceClient();
  const { data: charges, error: updErr } = await supabase
    .from("charges")
    .update({ status: "pendente" satisfies ChargeStatusDb, pago_em: null })
    .eq("id", chargeId)
    .select("*");
  if (updErr) {
    throw new ChargesRepoError("reverterPagamento(update)", updErr.message);
  }
  const charge = charges && charges.length > 0 ? (charges[0] as DbCharge) : null;
  if (!charge) {
    return { charge: null, payment: null };
  }
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      owner_id: charge.owner_id,
      charge_id: charge.id,
      mp_payment_id: pagamento.mpPaymentId,
      status: pagamento.status,
      valor_centavos: pagamento.valorCentavos,
      metodo: pagamento.metodo,
      raw: pagamento.raw,
    })
    .select("*")
    .single();
  if (payErr) {
    if (payErr.code === "23505") {
      return { charge, payment: null };
    }
    throw new ChargesRepoError("reverterPagamento(payment)", payErr.message);
  }
  return { charge, payment: payment as DbPayment };
}
