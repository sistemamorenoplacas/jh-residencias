/**
 * Integração com o Mercado Pago (API v1).
 *
 * Server-only: usa `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` via `serverEnv()`.
 * NUNCA importe este arquivo a partir de código `'use client'` — exporia o
 * access token ao bundle do browser.
 *
 * Sem SDK: usamos `fetch` nativo + `node:crypto` para a assinatura do webhook.
 * Valores monetários trafegam em CENTAVOS na nossa borda; o MP usa reais
 * (`transaction_amount`), então convertemos na ida/volta.
 *
 * Ref: docs/04-INTEGRACOES.md → seção "Mercado Pago".
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";
import type { ChargeStatusDb } from "@/lib/db-types";

const MP_API_BASE = "https://api.mercadopago.com";

/** Resultado de `criarCobrancaPix`. */
export interface CobrancaPixResult {
  /** `id` do pagamento no MP (= `charge.mp_payment_id`). */
  mpPaymentId: string;
  /** Pix copia-e-cola (`qr_code`). */
  pixCopiaCola: string;
  /** Link de pagamento (`ticket_url`) ou `null` se o MP não retornar. */
  linkPagamento: string | null;
  /** QR code em PNG base64 (`qr_code_base64`) — sem o prefixo data URI. */
  qrCodeBase64: string | null;
}

/** Resultado de `consultarPagamento`. */
export interface ConsultaPagamentoResult {
  /** `id` do pagamento no MP. */
  mpPaymentId: string;
  /** Status cru do MP (`approved`, `pending`, ...). */
  status: string;
  /** Valor pago em centavos (derivado de `transaction_amount`). */
  valorCentavos: number;
  /** Meio de pagamento (`payment_method_id`, ex.: `pix`). */
  metodo: string;
  /** Payload bruto da resposta, para auditoria/persistência em `payments.raw`. */
  raw: unknown;
}

/** Campos extraídos do header `x-signature` do webhook. */
export interface SignatureHeaderParts {
  /** Timestamp (`ts=`). */
  ts: string | null;
  /** Hash HMAC declarado (`v1=`). */
  v1: string | null;
}

interface ValidarAssinaturaInput {
  /** Valor cru do header `x-signature`. */
  xSignature: string | null | undefined;
  /** Valor cru do header `x-request-id`. */
  xRequestId: string | null | undefined;
  /** Valor de `data.id` (query string `data.id`). */
  dataId: string | null | undefined;
  /**
   * Segredo do webhook. Se omitido, lê de `serverEnv().MP_WEBHOOK_SECRET`.
   * Passar explicitamente mantém a função pura/testável.
   */
  secret?: string;
}

interface CriarCobrancaPixInput {
  /** `charge.id` — vira `external_reference` no MP. */
  chargeId: string;
  /** Valor em centavos (convertido para reais na requisição). */
  valorCentavos: number;
  /** Vencimento `YYYY-MM-DD` — vira `date_of_expiration`. */
  vencimento: string;
  /** E-mail do pagador (`payer.email`). */
  payerEmail: string;
}

/**
 * Mapeia o status do MP para o status da nossa `charge`.
 *
 * - `approved` → `pago`
 * - `pending` / `in_process` / `rejected` → `pendente`
 * - `cancelled` → `cancelado`
 * - `refunded` → `pendente` (reverte a cobrança)
 *
 * Qualquer status desconhecido é tratado conservadoramente como `pendente`.
 */
export function mapStatusMpToCharge(status: string): ChargeStatusDb {
  switch (status) {
    case "approved":
      return "pago";
    case "cancelled":
      return "cancelado";
    case "pending":
    case "in_process":
    case "rejected":
    case "refunded":
      return "pendente";
    default:
      return "pendente";
  }
}

/**
 * Extrai `ts` e `v1` do header `x-signature` do MP.
 *
 * Formato esperado: `ts=1700000000,v1=abc123...` (ordem dos campos pode variar).
 * Função pura — não depende de env nem de I/O.
 */
export function extrairCamposAssinatura(
  xSignature: string | null | undefined,
): SignatureHeaderParts {
  const parts: SignatureHeaderParts = { ts: null, v1: null };
  if (!xSignature) return parts;

  for (const segmento of xSignature.split(",")) {
    const separador = segmento.indexOf("=");
    if (separador === -1) continue;

    const chave = segmento.slice(0, separador).trim();
    const valor = segmento.slice(separador + 1).trim();
    if (chave === "ts") {
      parts.ts = valor || null;
    } else if (chave === "v1") {
      parts.v1 = valor || null;
    }
  }

  return parts;
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 *
 * Monta o manifest `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`, calcula o
 * HMAC com o secret e compara (timing-safe) com o `v1` do header `x-signature`.
 *
 * PURA e testável: o secret pode ser passado por parâmetro; só cai para
 * `serverEnv()` quando omitido. Retorna `false` para qualquer entrada
 * malformada em vez de lançar — o caller decide o status HTTP.
 */
export function validarAssinaturaWebhook(input: ValidarAssinaturaInput): boolean {
  const { xSignature, xRequestId, dataId } = input;

  const { ts, v1 } = extrairCamposAssinatura(xSignature);
  if (!ts || !v1 || !xRequestId || !dataId) {
    return false;
  }

  const secret = input.secret ?? serverEnv().MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");

  return assinaturasIguais(esperado, v1);
}

/** Comparação constante-no-tempo de duas strings hex de mesmo papel. */
function assinaturasIguais(esperado: string, recebido: string): boolean {
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(recebido, "hex");
  // timingSafeEqual exige buffers de mesmo tamanho.
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cria uma cobrança Pix no Mercado Pago.
 *
 * `POST /v1/payments` com `payment_method_id: "pix"`. O `transaction_amount`
 * é o valor em reais (centavos / 100). `external_reference` carrega o
 * `chargeId` para reconciliar no webhook. `Idempotency-Key` evita cobranças
 * duplicadas em retries.
 */
export async function criarCobrancaPix(
  input: CriarCobrancaPixInput,
): Promise<CobrancaPixResult> {
  const { chargeId, valorCentavos, vencimento, payerEmail } = input;
  const { MP_ACCESS_TOKEN, APP_BASE_URL } = serverEnv();

  const body = {
    transaction_amount: centavosParaReais(valorCentavos),
    payment_method_id: "pix",
    external_reference: chargeId,
    date_of_expiration: vencimentoParaExpiration(vencimento, new Date()),
    payer: { email: payerEmail },
    description: `Aluguel — cobrança ${chargeId}`,
    // Notifica o webhook por pagamento (não depende só da config do painel MP).
    notification_url: `${APP_BASE_URL}/api/webhooks/mercadopago`,
  };

  const res = await fetch(`${MP_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      // Idempotência: o mesmo chargeId nunca gera dois pagamentos distintos.
      "X-Idempotency-Key": `charge-${chargeId}`,
    },
    body: JSON.stringify(body),
  });

  const payload: unknown = await lerJson(res);
  if (!res.ok) {
    throw new Error(
      `Mercado Pago — falha ao criar cobrança Pix (HTTP ${res.status}): ${descreverErroMp(payload)}`,
    );
  }

  return extrairCobrancaPix(payload);
}

/** Resultado de `criarCobrancaBoleto`. */
export interface CobrancaBoletoResult {
  /** `id` do pagamento boleto no MP (= `charge.boleto_mp_payment_id`). */
  mpPaymentId: string;
  /** URL do boleto (HTML/PDF) — `transaction_details.external_resource_url`. */
  boletoUrl: string | null;
  /** Linha digitável / código de barras — `barcode.content`. */
  linhaDigitavel: string | null;
}

/** Dados do pagador exigidos pelo boleto (todos obrigatórios no MP). */
export interface PayerBoleto {
  email: string;
  firstName: string;
  lastName: string;
  /** CPF só com dígitos. */
  cpf: string;
  /** CEP só com dígitos. */
  zipCode: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  /** UF (2 letras). */
  federalUnit: string;
}

interface CriarCobrancaBoletoInput {
  /** `charge.id` — vira `external_reference` no MP. */
  chargeId: string;
  valorCentavos: number;
  /** Vencimento `YYYY-MM-DD` — vira `date_of_expiration`. */
  vencimento: string;
  payer: PayerBoleto;
}

/**
 * Cria uma cobrança por boleto no Mercado Pago.
 *
 * `POST /v1/payments` com `payment_method_id: "bolbradesco"`. Diferente do Pix,
 * o boleto exige `payer` completo (nome, CPF e endereço) — o MP recusa sem eles.
 * `external_reference` carrega o `chargeId` (o webhook reconcilia por ele, igual
 * ao Pix). `Idempotency-Key` `boleto-<chargeId>` evita boletos duplicados.
 */
export async function criarCobrancaBoleto(
  input: CriarCobrancaBoletoInput,
): Promise<CobrancaBoletoResult> {
  const { chargeId, valorCentavos, vencimento, payer } = input;
  const { MP_ACCESS_TOKEN, APP_BASE_URL } = serverEnv();

  const body = {
    transaction_amount: centavosParaReais(valorCentavos),
    payment_method_id: "bolbradesco",
    external_reference: chargeId,
    date_of_expiration: vencimentoParaExpiration(vencimento, new Date()),
    description: `Aluguel — cobrança ${chargeId}`,
    notification_url: `${APP_BASE_URL}/api/webhooks/mercadopago`,
    payer: {
      email: payer.email,
      first_name: payer.firstName,
      last_name: payer.lastName,
      identification: { type: "CPF", number: payer.cpf },
      address: {
        zip_code: payer.zipCode,
        street_name: payer.streetName,
        street_number: payer.streetNumber,
        neighborhood: payer.neighborhood,
        city: payer.city,
        federal_unit: payer.federalUnit,
      },
    },
  };

  const res = await fetch(`${MP_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `boleto-${chargeId}`,
    },
    body: JSON.stringify(body),
  });

  const payload: unknown = await lerJson(res);
  if (!res.ok) {
    throw new Error(
      `Mercado Pago — falha ao criar boleto (HTTP ${res.status}): ${descreverErroMp(payload)}`,
    );
  }

  return extrairCobrancaBoleto(payload);
}

/**
 * Consulta um pagamento no MP por `id`.
 *
 * Usado pelo webhook para obter o status REAL (`approved`) em vez de confiar
 * apenas no payload da notificação.
 */
export async function consultarPagamento(
  mpPaymentId: string,
): Promise<ConsultaPagamentoResult> {
  const { MP_ACCESS_TOKEN } = serverEnv();

  const res = await fetch(
    `${MP_API_BASE}/v1/payments/${encodeURIComponent(mpPaymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );

  const payload: unknown = await lerJson(res);
  if (!res.ok) {
    throw new Error(
      `Mercado Pago — falha ao consultar pagamento ${mpPaymentId} (HTTP ${res.status}): ${descreverErroMp(payload)}`,
    );
  }

  return extrairConsultaPagamento(mpPaymentId, payload);
}

// ---------------------------------------------------------------------------
// Helpers internos (extração de payloads + conversões)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function centavosParaReais(valorCentavos: number): number {
  return Math.round(valorCentavos) / 100;
}

/** Offset fixo de Brasília (Brasil não usa horário de verão desde 2019). */
const OFFSET_BRASILIA = "-03:00";

/**
 * Janela mínima quando a cobrança já venceu (ou vence hoje muito em cima da
 * hora): o Pix precisa continuar pagável, então damos N dias a partir de agora.
 * O MP recusa `date_of_expiration` no passado com HTTP 400.
 */
const DIAS_MINIMOS_EXPIRACAO = 3;

/** Margem acima do mínimo de 30 min exigido pelo MP, para folga. */
const MARGEM_MINIMA_MS = 60 * 60 * 1000; // 1h

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const MS_OFFSET_BRASILIA = 3 * 60 * 60 * 1000;

/** Dia-calendário de Brasília (`YYYY-MM-DD`) de um instante qualquer. */
function diaBrasilia(instante: Date): string {
  const emBrasilia = new Date(instante.getTime() - MS_OFFSET_BRASILIA);
  const ano = emBrasilia.getUTCFullYear();
  const mes = String(emBrasilia.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(emBrasilia.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * `YYYY-MM-DD` → ISO 8601 (`date_of_expiration`) que o MP aceita.
 *
 * O Pix expira no fim do dia do vencimento. Se esse instante já passou (ou está
 * a menos de 1h de agora), a cobrança está atrasada: garantimos uma janela de
 * {@link DIAS_MINIMOS_EXPIRACAO} dias para o inquilino ainda pagar, evitando o
 * HTTP 400 "Invalid date_of_expiration".
 */
export function vencimentoParaExpiration(vencimento: string, agora: Date): string {
  const fimDoVencimento = `${vencimento}T23:59:59.000${OFFSET_BRASILIA}`;
  const limiteMinimo = agora.getTime() + MARGEM_MINIMA_MS;
  if (Date.parse(fimDoVencimento) >= limiteMinimo) {
    return fimDoVencimento;
  }
  const alvo = new Date(agora.getTime() + DIAS_MINIMOS_EXPIRACAO * MS_POR_DIA);
  return `${diaBrasilia(alvo)}T23:59:59.000${OFFSET_BRASILIA}`;
}

/** Lê o corpo como JSON tolerando respostas vazias/não-JSON. */
async function lerJson(res: Response): Promise<unknown> {
  const texto = await res.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return texto;
  }
}

/** Extrai uma mensagem de erro legível do payload de erro do MP. */
function descreverErroMp(payload: unknown): string {
  if (isRecord(payload)) {
    const message = payload.message;
    if (typeof message === "string" && message.length > 0) return message;
    const error = payload.error;
    if (typeof error === "string" && error.length > 0) return error;
  }
  if (typeof payload === "string" && payload.length > 0) return payload;
  return "resposta sem detalhes";
}

function extrairCobrancaPix(payload: unknown): CobrancaPixResult {
  if (!isRecord(payload)) {
    throw new Error("Mercado Pago — resposta de cobrança Pix inesperada");
  }

  const mpPaymentId = stringDe(payload.id);
  if (!mpPaymentId) {
    throw new Error("Mercado Pago — resposta sem `id` de pagamento");
  }

  const transactionData = extrairTransactionData(payload);
  const pixCopiaCola = stringDe(transactionData?.qr_code) ?? "";
  if (!pixCopiaCola) {
    throw new Error(
      "Mercado Pago — resposta sem `qr_code` (Pix copia-e-cola)",
    );
  }

  return {
    mpPaymentId,
    pixCopiaCola,
    linkPagamento: stringDe(transactionData?.ticket_url),
    qrCodeBase64: stringDe(transactionData?.qr_code_base64),
  };
}

function extrairTransactionData(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const poi = payload.point_of_interaction;
  if (!isRecord(poi)) return null;
  const data = poi.transaction_data;
  return isRecord(data) ? data : null;
}

/**
 * Extrai id, URL e linha digitável do payload de um pagamento boleto do MP.
 * PURA — exportada para teste sem rede.
 */
export function extrairCobrancaBoleto(payload: unknown): CobrancaBoletoResult {
  if (!isRecord(payload)) {
    throw new Error("Mercado Pago — resposta de boleto inesperada");
  }

  const mpPaymentId = stringDe(payload.id);
  if (!mpPaymentId) {
    throw new Error("Mercado Pago — resposta de boleto sem `id` de pagamento");
  }

  const transactionDetails = isRecord(payload.transaction_details)
    ? payload.transaction_details
    : null;
  const barcode = isRecord(payload.barcode) ? payload.barcode : null;

  return {
    mpPaymentId,
    boletoUrl: stringDe(transactionDetails?.external_resource_url),
    linhaDigitavel: stringDe(barcode?.content),
  };
}

function extrairConsultaPagamento(
  mpPaymentId: string,
  payload: unknown,
): ConsultaPagamentoResult {
  if (!isRecord(payload)) {
    throw new Error(
      `Mercado Pago — resposta inesperada ao consultar ${mpPaymentId}`,
    );
  }

  const status = stringDe(payload.status) ?? "";
  const reais = numeroDe(payload.transaction_amount) ?? 0;
  const metodo = stringDe(payload.payment_method_id) ?? "";

  return {
    mpPaymentId: stringDe(payload.id) ?? mpPaymentId,
    status,
    valorCentavos: Math.round(reais * 100),
    metodo,
    raw: payload,
  };
}

/** Coerção segura para string (aceita number, ex.: `id` numérico do MP). */
function stringDe(value: unknown): string | null {
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numeroDe(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
