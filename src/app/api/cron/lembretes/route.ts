import "server-only";

/**
 * Cron de lembretes (Fluxo C). POST protegido por `Bearer CRON_SECRET`.
 *
 * Passos:
 *   1) `marcarChargesVencidas(hoje)` — transiciona `pendente` -> `vencido` o que
 *      já passou do vencimento.
 *   2) `buscarChargesParaLembrete(hoje)` — charges em aberto nos marcos D-3 / D0
 *      / D+1 / D+5 (já com inquilino + contrato).
 *   3) Para cada charge, envia `lembreteVencimento` via WhatsApp e registra em
 *      `whatsapp_messages`.
 *
 * Idempotência: o cron pode rodar mais de uma vez no mesmo dia (retry do
 * scheduler). Antes de enviar, consultamos os `whatsapp_messages` de lembrete
 * já gravados HOJE (UTC) por charge; se já houve um envio bem-sucedido (status
 * != `falhou`) para a mesma charge hoje, pulamos. Falhas anteriores NÃO contam
 * como envio, então uma nova tentativa pode ocorrer.
 *
 * Usa SERVICE ROLE (sem usuário autenticado): o repositório e a leitura/escrita
 * de `whatsapp_messages` ignoram RLS por design.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { lembreteVencimento } from "@/lib/whatsapp";
import {
  buscarChargesParaLembrete,
  marcarChargesVencidas,
  type ChargeLembrete,
} from "@/lib/charges-repo";
import { formatBRL } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";
import { ownersComAutomacaoDesligada } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Template gravado em `whatsapp_messages.template` para lembretes. */
const TEMPLATE_LEMBRETE = "lembrete_vencimento";

/** Erro estruturado por charge, devolvido na resposta para diagnóstico. */
interface ErroLembrete {
  chargeId: string;
  motivo: string;
}

interface RespostaCron {
  vencidasMarcadas: number;
  lembretesEnviados: number;
  erros: ErroLembrete[];
}

/** Compara o Bearer informado com `CRON_SECRET` em tempo constante. */
function autorizado(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const token = header.slice(prefix.length);
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length) return false;

  return timingSafeEqual(tokenBuf, secretBuf);
}

/** Data ISO `YYYY-MM-DD` (UTC) de uma data. */
function hojeIsoUtc(hoje: Date): string {
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${hoje.getUTCFullYear()}-${pad(hoje.getUTCMonth() + 1)}-${pad(
    hoje.getUTCDate(),
  )}`;
}

/**
 * Ids de charges que JÁ receberam um lembrete bem-sucedido hoje (UTC). Usado
 * para não reenviar o mesmo lembrete no mesmo dia. Falhas não entram.
 */
async function chargesJaLembradasHoje(hojeStr: string): Promise<Set<string>> {
  const supabase = createServiceClient();
  const inicioDia = `${hojeStr}T00:00:00.000Z`;
  const fimDia = `${hojeStr}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("charge_id, status")
    .eq("template", TEMPLATE_LEMBRETE)
    .neq("status", "falhou")
    .not("charge_id", "is", null)
    .gte("created_at", inicioDia)
    .lte("created_at", fimDia);

  if (error) {
    throw new Error(
      `Falha ao consultar lembretes já enviados hoje: ${error.message}`,
    );
  }

  const ids = new Set<string>();
  for (const row of (data ?? []) as { charge_id: string | null }[]) {
    if (row.charge_id) ids.add(row.charge_id);
  }
  return ids;
}

/** Grava o log do lembrete em `whatsapp_messages`. */
async function registrarLog(input: {
  ownerId: string;
  chargeId: string;
  tenantId: string;
  wamid: string | null;
  status: "enviado" | "falhou";
  erro: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("whatsapp_messages").insert({
    owner_id: input.ownerId,
    charge_id: input.chargeId,
    tenant_id: input.tenantId,
    template: TEMPLATE_LEMBRETE,
    wamid: input.wamid,
    status: input.status,
    erro: input.erro,
  });

  if (error) {
    throw new Error(`Falha ao gravar log do lembrete: ${error.message}`);
  }
}

/**
 * Envia o lembrete de uma charge e grava o log. Retorna `true` se enviado.
 * Erros de envio são capturados, logados como `falhou` e propagados como
 * `ErroLembrete` pelo chamador.
 */
async function processarLembrete(lembrete: ChargeLembrete): Promise<void> {
  const { charge, tenant } = lembrete;

  let wamid: string | null = null;
  try {
    const result = await lembreteVencimento({
      to: tenant.telefone,
      nome: tenant.nome,
      competencia: formatCompetencia(charge.competencia),
      valor: formatBRL(charge.valor_centavos),
      vencimento: formatData(charge.vencimento),
      chargeId: charge.id,
    });
    wamid = result.wamid;
  } catch (error: unknown) {
    const motivo =
      error instanceof Error ? error.message : "erro desconhecido no envio";
    // Registra a falha (best-effort) e propaga para o chamador contabilizar.
    await registrarLog({
      ownerId: charge.owner_id,
      chargeId: charge.id,
      tenantId: tenant.id,
      wamid: null,
      status: "falhou",
      erro: motivo,
    });
    throw new Error(motivo);
  }

  await registrarLog({
    ownerId: charge.owner_id,
    chargeId: charge.id,
    tenantId: tenant.id,
    wamid,
    status: "enviado",
    erro: null,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let env;
  try {
    env = serverEnv();
  } catch (error: unknown) {
    const motivo =
      error instanceof Error ? error.message : "configuração inválida";
    return NextResponse.json({ error: motivo }, { status: 500 });
  }

  if (!autorizado(request, env.CRON_SECRET)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const hoje = new Date();
  const hojeStr = hojeIsoUtc(hoje);
  const erros: ErroLembrete[] = [];

  // 1) Marca vencidas.
  let vencidasMarcadas = 0;
  try {
    const vencidas = await marcarChargesVencidas(hoje);
    vencidasMarcadas = vencidas.length;
  } catch (error: unknown) {
    const motivo =
      error instanceof Error ? error.message : "erro ao marcar vencidas";
    return NextResponse.json({ error: motivo }, { status: 500 });
  }

  // 2) Busca candidatas + 3) envia, evitando reenvio no mesmo dia.
  let lembretes: ChargeLembrete[];
  let jaLembradas: Set<string>;
  try {
    [lembretes, jaLembradas] = await Promise.all([
      buscarChargesParaLembrete(hoje),
      chargesJaLembradasHoje(hojeStr),
    ]);
  } catch (error: unknown) {
    const motivo =
      error instanceof Error ? error.message : "erro ao buscar lembretes";
    return NextResponse.json(
      { error: motivo, vencidasMarcadas },
      { status: 500 },
    );
  }

  // Pula donos que desligaram os lembretes nas Configurações.
  const semLembretes = await ownersComAutomacaoDesligada("lembretes_ativos");

  let lembretesEnviados = 0;
  for (const lembrete of lembretes) {
    if (jaLembradas.has(lembrete.charge.id)) continue;
    if (semLembretes.has(lembrete.charge.owner_id)) continue;

    try {
      await processarLembrete(lembrete);
      lembretesEnviados += 1;
      // Marca em memória para não reenviar caso a mesma charge apareça 2x.
      jaLembradas.add(lembrete.charge.id);
    } catch (error: unknown) {
      const motivo =
        error instanceof Error ? error.message : "erro desconhecido";
      erros.push({ chargeId: lembrete.charge.id, motivo });
    }
  }

  const resposta: RespostaCron = {
    vencidasMarcadas,
    lembretesEnviados,
    erros,
  };

  return NextResponse.json(resposta, { status: 200 });
}
