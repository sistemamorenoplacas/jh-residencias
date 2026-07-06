/**
 * Estado do formulário de contrato (lease) — compartilhado entre a Server
 * Action e o client (`useActionState`).
 *
 * Vive FORA do arquivo `"use server"` (`actions.ts`) porque um módulo de Server
 * Actions só pode exportar funções async; exportar um objeto/constante de lá
 * dispara "A 'use server' file can only export async functions, found object".
 */
export type LeaseField =
  | "propertyId"
  | "tenantId"
  | "valor"
  | "diaVencimento"
  | "multaPercent"
  | "jurosMesPercent"
  | "inicio"
  | "fim";

export interface LeaseFormState {
  error: string | null;
  fieldErrors?: Partial<Record<LeaseField, string>>;
}

export const INITIAL_LEASE_STATE: LeaseFormState = { error: null };
