"use server";

/**
 * Server Actions de cobranças.
 *
 * - `gerarCobrancaAvulsa(leaseId, competencia)`: cria (idempotente) a charge do
 *   mês para um contrato, gera o Pix no Mercado Pago, anexa os dados de
 *   pagamento e dispara o template `cobranca_aluguel` no WhatsApp.
 * - `reenviarCobranca(chargeId)`: reenvia o template de cobrança de uma charge
 *   ainda em aberto (regenera o Pix se necessário).
 * - `cancelarCobranca(chargeId)`: marca a charge como `cancelado`.
 *
 * Server-only: usa o service-role client (ignora RLS) — autorização garantida
 * pelo guard de sessão do layout `(painel)`. Nunca importado por código client.
 */

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { DbCharge, DbLease, DbTenant } from "@/lib/db-types";
import {
  planejarCobrancasDoMes,
  competenciaAtual,
  type ChargePlan,
} from "@/lib/charge-generation";
import {
  inserirChargesIdempotente,
  atualizarDadosPagamentoCharge,
  ChargesRepoError,
  PAYER_EMAIL_FALLBACK,
} from "@/lib/charges-repo";
import {
  criarCobrancaPix,
  criarCobrancaBoleto,
  type PayerBoleto,
} from "@/lib/mercadopago";
import { cobrancaAluguel } from "@/lib/whatsapp";
import { formatAmount } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";

/** Resultado uniforme das actions, consumível por formulários/handlers client. */
export interface CobrancaActionState {
  ok: boolean;
  error: string | null;
}

const COMPETENCIA_RE = /^\d{4}-\d{2}-01$/;

function mensagemErro(error: unknown): string {
  if (error instanceof ChargesRepoError || error instanceof Error) {
    return error.message;
  }
  return "Erro inesperado ao processar a cobrança.";
}

/** Carrega lease + tenant (para e-mail/telefone) escopados ao owner. */
async function carregarLeaseComTenant(
  ownerId: string,
  leaseId: string,
): Promise<{ lease: DbLease; tenant: DbTenant }> {
  const supabase = createServiceClient();

  const { data: lease, error: leaseErr } = await supabase
    .from("leases")
    .select("*")
    .eq("id", leaseId)
    .eq("owner_id", ownerId)
    .single();

  if (leaseErr || !lease) {
    throw new Error("Contrato não encontrado.");
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", (lease as DbLease).tenant_id)
    .eq("owner_id", ownerId)
    .single();

  if (tenantErr || !tenant) {
    throw new Error("Inquilino do contrato não encontrado.");
  }

  return { lease: lease as DbLease, tenant: tenant as DbTenant };
}

/** Carrega charge + lease + tenant a partir de um chargeId, escopados ao owner. */
async function carregarChargeComContexto(
  ownerId: string,
  chargeId: string,
): Promise<{ charge: DbCharge; lease: DbLease; tenant: DbTenant }> {
  const supabase = createServiceClient();

  const { data: charge, error: chargeErr } = await supabase
    .from("charges")
    .select("*")
    .eq("id", chargeId)
    .eq("owner_id", ownerId)
    .single();

  if (chargeErr || !charge) {
    throw new Error("Cobrança não encontrada.");
  }

  const { lease, tenant } = await carregarLeaseComTenant(
    ownerId,
    (charge as DbCharge).lease_id,
  );

  return { charge: charge as DbCharge, lease, tenant };
}

/** Garante a existência da charge do par (lease, competência) e a retorna. */
async function garantirCharge(
  plan: ChargePlan,
  ownerId: string,
): Promise<DbCharge> {
  const novas = await inserirChargesIdempotente([{ ...plan, ownerId }]);
  if (novas.length > 0) {
    return novas[0];
  }

  // Já existia (idempotência): busca a existente.
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("lease_id", plan.leaseId)
    .eq("competencia", plan.competencia)
    .eq("owner_id", ownerId)
    .single();

  if (error || !data) {
    throw new Error("Falha ao localizar a cobrança gerada.");
  }
  return data as DbCharge;
}

/** Cria o Pix no MP e anexa os dados de pagamento à charge. Retorna a charge atualizada. */
async function gerarPixEAnexar(
  charge: DbCharge,
  payerEmail: string,
): Promise<DbCharge> {
  const pix = await criarCobrancaPix({
    chargeId: charge.id,
    valorCentavos: charge.valor_centavos,
    vencimento: charge.vencimento,
    payerEmail,
  });

  return atualizarDadosPagamentoCharge(charge.id, {
    mpPaymentId: pix.mpPaymentId,
    pixCopiaCola: pix.pixCopiaCola,
    linkPagamento: pix.linkPagamento,
  });
}

/** E-mail do pagador para o MP — o tenant pode não ter e-mail cadastrado. */
function emailPagador(tenant: DbTenant): string {
  return tenant.email ?? PAYER_EMAIL_FALLBACK;
}

/** Remove tudo que não for dígito (CPF/CEP chegam mascarados da UI). */
function soDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/**
 * Monta o `payer` do boleto a partir do tenant, ou `null` se faltar algum dado
 * obrigatório do MP (CPF de 11 dígitos, CEP de 8, endereço completo, UF).
 */
function dadosBoletoDoTenant(tenant: DbTenant): PayerBoleto | null {
  const cpf = soDigitos(tenant.cpf);
  const zipCode = soDigitos(tenant.cep);
  const partesNome = tenant.nome.trim().split(/\s+/);
  const firstName = partesNome[0] ?? "";
  const lastName =
    partesNome.length > 1 ? partesNome.slice(1).join(" ") : firstName;
  const streetName = (tenant.logradouro ?? "").trim();
  const streetNumber = (tenant.numero ?? "").trim();
  const neighborhood = (tenant.bairro ?? "").trim();
  const city = (tenant.cidade ?? "").trim();
  const federalUnit = (tenant.uf ?? "").trim().toUpperCase();

  const completo =
    cpf.length === 11 &&
    zipCode.length === 8 &&
    firstName.length > 0 &&
    streetName.length > 0 &&
    streetNumber.length > 0 &&
    neighborhood.length > 0 &&
    city.length > 0 &&
    federalUnit.length === 2;

  if (!completo) return null;

  return {
    email: emailPagador(tenant),
    firstName,
    lastName,
    cpf,
    zipCode,
    streetName,
    streetNumber,
    neighborhood,
    city,
    federalUnit,
  };
}

/**
 * Gera o boleto no MP (quando o inquilino tem CPF + endereço completos) e anexa
 * à charge. Best-effort e DELIBERADAMENTE tolerante: o boleto é complementar ao
 * Pix; se faltar dado ou o MP falhar, seguimos com o Pix (o inquilino sempre tem
 * como pagar) em vez de derrubar a cobrança inteira. Retorna a charge — já
 * atualizada quando o boleto é emitido.
 */
async function gerarBoletoEAnexar(
  charge: DbCharge,
  tenant: DbTenant,
): Promise<DbCharge> {
  if (charge.boleto_url) return charge;

  const payer = dadosBoletoDoTenant(tenant);
  if (!payer) return charge;

  try {
    const boleto = await criarCobrancaBoleto({
      chargeId: charge.id,
      valorCentavos: charge.valor_centavos,
      vencimento: charge.vencimento,
      payer,
    });

    return atualizarDadosPagamentoCharge(charge.id, {
      boletoUrl: boleto.boletoUrl,
      boletoLinhaDigitavel: boleto.linhaDigitavel,
      boletoMpPaymentId: boleto.mpPaymentId,
    });
  } catch {
    return charge;
  }
}

/**
 * Gera uma cobrança avulsa para um contrato numa competência (`YYYY-MM-01`).
 * Idempotente quanto à charge; gera Pix e notifica o inquilino por WhatsApp.
 */
export async function gerarCobrancaAvulsa(
  leaseId: string,
  competencia: string,
): Promise<CobrancaActionState> {
  const user = await requireUser();

  if (!leaseId) {
    return { ok: false, error: "Selecione um contrato." };
  }
  if (!COMPETENCIA_RE.test(competencia)) {
    return { ok: false, error: "Competência inválida (use YYYY-MM-01)." };
  }

  try {
    const { lease, tenant } = await carregarLeaseComTenant(user.id, leaseId);

    const [plan] = planejarCobrancasDoMes([lease], competencia);
    const charge = await garantirCharge(plan, user.id);

    if (charge.status === "cancelado") {
      return {
        ok: false,
        error: "Cobrança já cancelada para esta competência.",
      };
    }
    if (charge.status === "pago") {
      return { ok: false, error: "Cobrança já paga para esta competência." };
    }

    const comPix = charge.pix_copia_cola
      ? charge
      : await gerarPixEAnexar(charge, emailPagador(tenant));

    const comBoleto = await gerarBoletoEAnexar(comPix, tenant);

    await notificarCobranca(comBoleto, tenant);

    revalidatePath("/cobrancas");
    revalidatePath(`/cobrancas/${comBoleto.id}`);
    return { ok: true, error: null };
  } catch (error: unknown) {
    return { ok: false, error: mensagemErro(error) };
  }
}

/** Dispara o template `cobranca_aluguel` e registra o envio em whatsapp_messages. */
async function notificarCobranca(
  charge: DbCharge,
  tenant: DbTenant,
): Promise<void> {
  const { wamid } = await cobrancaAluguel({
    to: tenant.telefone,
    nome: tenant.nome,
    competencia: formatCompetencia(charge.competencia),
    valor: formatAmount(charge.valor_centavos),
    vencimento: formatData(charge.vencimento),
    chargeId: charge.id,
  });

  const supabase = createServiceClient();
  await supabase.from("whatsapp_messages").insert({
    owner_id: charge.owner_id,
    charge_id: charge.id,
    tenant_id: tenant.id,
    template: "cobranca_aluguel",
    wamid,
    status: "enviado",
  });
}

/**
 * Reenvia a notificação de cobrança de uma charge em aberto. Regenera o Pix se
 * a charge ainda não tiver `pix_copia_cola`.
 */
export async function reenviarCobranca(
  chargeId: string,
): Promise<CobrancaActionState> {
  const user = await requireUser();

  if (!chargeId) {
    return { ok: false, error: "Cobrança inválida." };
  }

  try {
    const { charge, tenant } = await carregarChargeComContexto(
      user.id,
      chargeId,
    );

    if (charge.status === "pago") {
      return { ok: false, error: "Cobrança já paga — nada a reenviar." };
    }
    if (charge.status === "cancelado") {
      return { ok: false, error: "Cobrança cancelada — não pode reenviar." };
    }

    const comPix = charge.pix_copia_cola
      ? charge
      : await gerarPixEAnexar(charge, emailPagador(tenant));

    const comBoleto = await gerarBoletoEAnexar(comPix, tenant);

    await notificarCobranca(comBoleto, tenant);

    revalidatePath("/cobrancas");
    revalidatePath(`/cobrancas/${charge.id}`);
    return { ok: true, error: null };
  } catch (error: unknown) {
    return { ok: false, error: mensagemErro(error) };
  }
}

/** Marca uma charge em aberto como `cancelado`. */
export async function cancelarCobranca(
  chargeId: string,
): Promise<CobrancaActionState> {
  const user = await requireUser();

  if (!chargeId) {
    return { ok: false, error: "Cobrança inválida." };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("charges")
      .update({ status: "cancelado" })
      .eq("id", chargeId)
      .eq("owner_id", user.id)
      .neq("status", "pago")
      .select("*");

    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      return {
        ok: false,
        error: "Cobrança não encontrada ou já paga — não pode cancelar.",
      };
    }

    revalidatePath("/cobrancas");
    revalidatePath(`/cobrancas/${chargeId}`);
    return { ok: true, error: null };
  } catch (error: unknown) {
    return { ok: false, error: mensagemErro(error) };
  }
}

export async function marcarPagoManualmente(
  chargeId: string,
): Promise<CobrancaActionState> {
  const user = await requireUser();

  if (!chargeId) return { ok: false, error: "Cobrança inválida." };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("charges")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", chargeId)
      .eq("owner_id", user.id)
      .in("status", ["pendente", "vencido"])
      .select("*");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return { ok: false, error: "Cobrança não encontrada ou já processada." };
    }

    revalidatePath("/cobrancas");
    revalidatePath(`/cobrancas/${chargeId}`);
    return { ok: true, error: null };
  } catch (error: unknown) {
    return { ok: false, error: mensagemErro(error) };
  }
}

/** Resultado do disparo manual de geração do mês (para o painel de config). */
export interface GerarLoteState {
  ok: boolean;
  message: string;
}

/**
 * Gera (sob demanda) as cobranças do mês corrente para TODOS os contratos
 * ativos do admin logado — a mesma automação que o cron roda dia 1, mas manual.
 *
 * Idempotente: pula os contratos que já têm cobrança na competência atual, para
 * não recriar nem reenviar WhatsApp. Cada contrato novo passa pelo fluxo padrão
 * (`gerarCobrancaAvulsa`): cria a charge, gera Pix + boleto e notifica.
 */
export async function gerarCobrancasDoMes(): Promise<GerarLoteState> {
  const user = await requireUser();
  const competencia = competenciaAtual(new Date());
  const supabase = createServiceClient();

  const { data: leases, error } = await supabase
    .from("leases")
    .select("id")
    .eq("owner_id", user.id)
    .eq("ativo", true);

  if (error) {
    return { ok: false, message: "Falha ao listar os contratos ativos." };
  }

  const ativos = (leases ?? []) as { id: string }[];
  if (ativos.length === 0) {
    return { ok: true, message: "Nenhum contrato ativo para gerar cobranças." };
  }

  let geradas = 0;
  let jaExistiam = 0;
  let avisos = 0;

  for (const lease of ativos) {
    const { data: existente } = await supabase
      .from("charges")
      .select("id")
      .eq("lease_id", lease.id)
      .eq("competencia", competencia)
      .maybeSingle();

    if (existente) {
      jaExistiam += 1;
      continue;
    }

    const resultado = await gerarCobrancaAvulsa(lease.id, competencia);
    if (resultado.ok) {
      geradas += 1;
    } else {
      avisos += 1;
    }
  }

  revalidatePath("/cobrancas");

  const partes = [`${geradas} cobrança(s) gerada(s) e enviada(s)`];
  if (jaExistiam > 0) partes.push(`${jaExistiam} já existia(m) este mês`);
  if (avisos > 0) partes.push(`${avisos} com aviso`);

  return { ok: true, message: `${partes.join(" · ")}.` };
}
