/**
 * Integração WhatsApp Cloud API (Meta) — server-only.
 *
 * Envia templates aprovados (categoria UTILITY) via Graph API, verifica o
 * handshake do webhook (`hub.*`), valida a assinatura `X-Hub-Signature-256`
 * e extrai atualizações de status das mensagens.
 *
 * Templates esperados (aprovados na Meta), todos em `pt_BR`:
 *   - `cobranca_aluguel`     {{1}} nome · {{2}} competência · {{3}} valor · {{4}} vencimento · {{5}} link/Pix
 *   - `lembrete_vencimento`  mesma ordem (lembrete D-3 / vencido)
 *   - `pagamento_confirmado` confirmação após o webhook do Mercado Pago
 *
 * Convenções: telefone E.164 sem `+` é aceito pela Graph API; aqui normalizamos
 * removendo o `+` inicial. Datas ISO `YYYY-MM-DD`. Valores já formatados (string
 * "1.234,56") chegam prontos do chamador — este módulo NÃO converte centavos.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = "https://graph.facebook.com";
const TEMPLATE_LANGUAGE = "pt_BR";

/** Nomes exatos dos templates aprovados na Meta. */
export const WHATSAPP_TEMPLATES = {
  cobrancaAluguel: "cobranca_aluguel",
  lembreteVencimento: "lembrete_vencimento",
  pagamentoConfirmado: "pagamento_confirmado",
} as const;

export type WhatsappTemplateName =
  (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

/** Parâmetro posicional `{{n}}` de um componente `body` de template. */
export interface TemplateParam {
  type: "text";
  text: string;
}

export interface EnviarTemplateInput {
  /** Destino em E.164 (com ou sem `+`); normalizado internamente. */
  to: string;
  /** Nome do template aprovado na Meta. */
  template: WhatsappTemplateName | string;
  /** Parâmetros do corpo na ordem dos `{{n}}`. */
  params: readonly string[];
}

export interface EnviarTemplateResult {
  /** Id da mensagem (`wamid`) retornado pela Graph API. */
  wamid: string;
}

/** Status normalizado de uma mensagem (shape do banco). */
export type WhatsappStatus = "enviado" | "entregue" | "lido" | "falhou";

export interface StatusUpdate {
  wamid: string;
  status: WhatsappStatus;
}

/** Remove o `+` inicial de um número E.164 — a Graph API espera só dígitos. */
function normalizarTelefone(to: string): string {
  return to.replace(/^\+/, "");
}

/** Monta os `parameters` de body a partir dos textos posicionais. */
function montarParametros(params: readonly string[]): TemplateParam[] {
  return params.map((text) => ({ type: "text", text }));
}

/**
 * Envia um template via WhatsApp Cloud API.
 *
 * `POST {GRAPH_BASE}/{version}/{PHONE_NUMBER_ID}/messages` com
 * `Authorization: Bearer WHATSAPP_TOKEN`. Lança erro com o corpo da resposta
 * quando a Graph API responde fora de 2xx ou quando o `wamid` não vem.
 */
export async function enviarTemplate(
  input: EnviarTemplateInput,
): Promise<EnviarTemplateResult> {
  const env = serverEnv();
  const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: normalizarTelefone(input.to),
    type: "template",
    template: {
      name: input.template,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        {
          type: "body",
          parameters: montarParametros(input.params),
        },
      ],
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    throw new Error(`Falha de rede ao chamar WhatsApp Cloud API: ${message}`);
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `WhatsApp Cloud API respondeu ${response.status}: ${raw || "(corpo vazio)"}`,
    );
  }

  const wamid = extrairWamid(raw);
  if (!wamid) {
    throw new Error(
      `Resposta do WhatsApp sem messages[0].id (wamid): ${raw || "(corpo vazio)"}`,
    );
  }

  return { wamid };
}

/** Extrai `messages[0].id` de uma resposta de envio. Retorna `null` se ausente. */
function extrairWamid(rawBody: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const messages = (parsed as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const first = messages[0];
  if (typeof first !== "object" || first === null) return null;
  const id = (first as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// --- Helpers tipados por template -----------------------------------------

export interface CobrancaAluguelInput {
  to: string;
  nome: string;
  competencia: string;
  valor: string;
  vencimento: string;
  link: string;
}

/**
 * `cobranca_aluguel` —
 * {{1}} nome · {{2}} competência · {{3}} valor · {{4}} vencimento · {{5}} link/Pix.
 */
export function cobrancaAluguel(
  input: CobrancaAluguelInput,
): Promise<EnviarTemplateResult> {
  return enviarTemplate({
    to: input.to,
    template: WHATSAPP_TEMPLATES.cobrancaAluguel,
    params: [
      input.nome,
      input.competencia,
      input.valor,
      input.vencimento,
      input.link,
    ],
  });
}

export interface LembreteVencimentoInput {
  to: string;
  nome: string;
  competencia: string;
  valor: string;
  vencimento: string;
  link: string;
}

/**
 * `lembrete_vencimento` —
 * {{1}} nome · {{2}} competência · {{3}} valor · {{4}} vencimento · {{5}} link/Pix.
 */
export function lembreteVencimento(
  input: LembreteVencimentoInput,
): Promise<EnviarTemplateResult> {
  return enviarTemplate({
    to: input.to,
    template: WHATSAPP_TEMPLATES.lembreteVencimento,
    params: [
      input.nome,
      input.competencia,
      input.valor,
      input.vencimento,
      input.link,
    ],
  });
}

export interface PagamentoConfirmadoInput {
  to: string;
  nome: string;
  competencia: string;
  valor: string;
}

/**
 * `pagamento_confirmado` —
 * {{1}} nome · {{2}} competência · {{3}} valor.
 */
export function pagamentoConfirmado(
  input: PagamentoConfirmadoInput,
): Promise<EnviarTemplateResult> {
  return enviarTemplate({
    to: input.to,
    template: WHATSAPP_TEMPLATES.pagamentoConfirmado,
    params: [input.nome, input.competencia, input.valor],
  });
}

// --- Webhook: verificação e assinatura ------------------------------------

export interface VerificarWebhookInput {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  /** Permite injetar o verify token (default: `serverEnv()`). */
  verifyToken?: string;
}

/**
 * Handshake de verificação do webhook (GET `hub.mode`/`hub.verify_token`/`hub.challenge`).
 * Retorna o `challenge` quando `mode === "subscribe"` e o token confere; senão `null`.
 * PURA quando `verifyToken` é fornecido.
 */
export function verificarWebhook(input: VerificarWebhookInput): string | null {
  const verifyToken = input.verifyToken ?? serverEnv().WHATSAPP_VERIFY_TOKEN;
  if (
    input.mode !== "subscribe" ||
    input.token === null ||
    input.challenge === null
  ) {
    return null;
  }
  const a = Buffer.from(input.token);
  const b = Buffer.from(verifyToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  return input.challenge;
}

export interface ValidarXHubSignatureInput {
  /** Corpo CRU da requisição (string exata recebida, sem reparse). */
  rawBody: string;
  /** Conteúdo do header `X-Hub-Signature-256` (ex.: `sha256=abc...`). */
  header: string | null;
  /** Permite injetar o app secret (default: `serverEnv()`). */
  appSecret?: string;
}

/**
 * Valida a assinatura `X-Hub-Signature-256`: HMAC-SHA256 do corpo cru com
 * `WHATSAPP_APP_SECRET`, comparado em tempo constante com o digest do header.
 * PURA quando `appSecret` é fornecido. Retorna `false` se header ausente/malformado.
 */
export function validarXHubSignature(input: ValidarXHubSignatureInput): boolean {
  if (!input.header) return false;

  const prefix = "sha256=";
  if (!input.header.startsWith(prefix)) return false;

  const recebido = input.header.slice(prefix.length).trim().toLowerCase();
  if (recebido.length === 0) return false;

  const secret = input.appSecret ?? serverEnv().WHATSAPP_APP_SECRET;
  const esperado = createHmac("sha256", secret)
    .update(input.rawBody, "utf8")
    .digest("hex");

  const recebidoBuf = Buffer.from(recebido, "hex");
  const esperadoBuf = Buffer.from(esperado, "hex");

  // Hex malformado vira buffer de tamanho diferente — timingSafeEqual lançaria.
  if (recebidoBuf.length !== esperadoBuf.length) return false;

  return timingSafeEqual(recebidoBuf, esperadoBuf);
}

// --- Webhook: parsing de statuses -----------------------------------------

/** Mapa status da Meta -> status do banco. */
const STATUS_MAP: Record<string, WhatsappStatus> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
};

/**
 * Extrai `entry[].changes[].value.statuses[]` de um payload de webhook,
 * mapeando para `[{ wamid, status }]`. Ignora entradas malformadas ou com
 * status não reconhecido. PURA.
 */
export function parseStatuses(payload: unknown): StatusUpdate[] {
  const updates: StatusUpdate[] = [];

  if (typeof payload !== "object" || payload === null) return updates;
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return updates;

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) continue;
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (typeof change !== "object" || change === null) continue;
      const value = (change as { value?: unknown }).value;
      if (typeof value !== "object" || value === null) continue;
      const statuses = (value as { statuses?: unknown }).statuses;
      if (!Array.isArray(statuses)) continue;

      for (const status of statuses) {
        if (typeof status !== "object" || status === null) continue;
        const wamid = (status as { id?: unknown }).id;
        const rawStatus = (status as { status?: unknown }).status;
        if (typeof wamid !== "string" || typeof rawStatus !== "string") continue;

        const mapped = STATUS_MAP[rawStatus];
        if (!mapped) continue;

        updates.push({ wamid, status: mapped });
      }
    }
  }

  return updates;
}
