/** Tipos de domínio. Datas em ISO-8601 (YYYY-MM-DD). Valores em centavos. */

export type ChargeStatus = "pendente" | "pago" | "vencido" | "cancelado";
export type PropertyTipo = "apartamento" | "casa" | "comercial";

export interface Property {
  id: string;
  nome: string;
  endereco: string;
  tipo: PropertyTipo;
}

export interface Tenant {
  id: string;
  nome: string;
  telefone: string; // E.164
  email: string | null;
  cpf: string | null;
  // Endereço do pagador (opcional) — usado na geração do boleto.
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  valorCentavos: number;
  diaVencimento: number; // 1..28
  multaPercent: number; // default 2.0
  jurosMesPercent: number; // default 1.0
  ativo: boolean;
}

export interface Charge {
  id: string;
  leaseId: string;
  competencia: string; // YYYY-MM-01
  valorCentavos: number; // base do contrato
  vencimento: string; // YYYY-MM-DD
  status: ChargeStatus;
  pixCopiaCola: string | null;
  linkPagamento: string | null;
  pagoEm: string | null;
}

/** Linha desnormalizada para a tabela de cobranças do painel. */
export interface ChargeRow {
  id: string;
  inquilino: string;
  imovel: string;
  competencia: string; // YYYY-MM-01
  vencimento: string; // YYYY-MM-DD
  valorCentavos: number;
  status: ChargeStatus;
  diasAtraso: number;
}
