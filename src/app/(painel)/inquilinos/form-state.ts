/**
 * Estado do formulário de inquilino — compartilhado entre a Server Action e o
 * client (`useActionState`).
 *
 * Vive FORA do arquivo `"use server"` (`actions.ts`) porque um módulo de Server
 * Actions só pode exportar funções async; exportar um objeto/constante de lá
 * dispara "A 'use server' file can only export async functions, found object".
 */
export interface TenantFormState {
  ok: boolean;
  error: string | null;
}

export const TENANT_FORM_INITIAL_STATE: TenantFormState = {
  ok: false,
  error: null,
};
