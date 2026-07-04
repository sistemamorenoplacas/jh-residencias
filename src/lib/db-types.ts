/**
 * Tipos de LINHA do banco (shape exato do Postgres, snake_case).
 *
 * Estes `Db*` são o formato cru retornado pelo Supabase. Os tipos de UI
 * (camelCase) vivem em `src/lib/types.ts` — NÃO duplique-os aqui. Os
 * repositórios mapeiam `Db*` -> tipos de domínio na borda.
 *
 * Convenções: datas ISO (`YYYY-MM-DD` para date, ISO 8601 para timestamptz),
 * valores monetários em centavos (integer).
 */

/** Mesmos valores de `ChargeStatus` em src/lib/types.ts, no shape do banco. */
export type ChargeStatusDb = "pendente" | "pago" | "vencido" | "cancelado";

/** Tipo do imóvel, igual ao enum textual do schema. */
export type PropertyTipoDb = "apartamento" | "casa" | "comercial";

/** Origem do evento de webhook. */
export type WebhookSourceDb = "mercadopago" | "whatsapp";

/** Status de uma mensagem WhatsApp. */
export type WhatsappStatusDb = "enviado" | "entregue" | "lido" | "falhou";

export interface DbProperty {
  id: string;
  owner_id: string;
  nome: string;
  endereco: string;
  tipo: PropertyTipoDb;
  created_at: string;
}

export interface DbTenant {
  id: string;
  owner_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  cpf: string | null;
  /** Endereço do pagador — exigido pelo boleto (Mercado Pago). Nullable. */
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  created_at: string;
}

export interface DbLease {
  id: string;
  owner_id: string;
  property_id: string;
  tenant_id: string;
  valor_centavos: number;
  dia_vencimento: number;
  inicio: string;
  fim: string | null;
  multa_percent: number;
  juros_mes_percent: number;
  ativo: boolean;
  created_at: string;
}

export interface DbCharge {
  id: string;
  owner_id: string;
  lease_id: string;
  competencia: string;
  valor_centavos: number;
  vencimento: string;
  status: ChargeStatusDb;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  pix_copia_cola: string | null;
  link_pagamento: string | null;
  pago_em: string | null;
  created_at: string;
}

export interface DbPayment {
  id: string;
  owner_id: string;
  charge_id: string;
  mp_payment_id: string;
  status: string;
  valor_centavos: number;
  metodo: string;
  raw: unknown;
  created_at: string;
}

export interface DbWhatsappMessage {
  id: string;
  owner_id: string;
  charge_id: string | null;
  tenant_id: string;
  template: string;
  wamid: string | null;
  status: WhatsappStatusDb;
  erro: string | null;
  created_at: string;
}

export interface DbWebhookEvent {
  id: string;
  source: WebhookSourceDb;
  event_id: string;
  payload: unknown;
  processed_at: string | null;
  created_at: string;
}
