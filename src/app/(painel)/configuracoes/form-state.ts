/**
 * Tipos e estados iniciais dos formulários de Configurações.
 *
 * Ficam FORA dos arquivos `"use server"`: desde o Next 16.3, um módulo de
 * Server Actions só pode exportar funções async — exportar um objeto derruba
 * o módulo inteiro em runtime ("A 'use server' file can only export async
 * functions, found object") e toda ação dele cai na tela de erro.
 */

export interface ConfigFormState {
  ok: boolean;
  error: string | null;
  /** True logo após um salvamento bem-sucedido (para feedback no form). */
  saved: boolean;
}

export const CONFIG_FORM_INITIAL_STATE: ConfigFormState = {
  ok: false,
  error: null,
  saved: false,
};

export interface ConviteState {
  ok: boolean;
  error: string | null;
  /** Preenchido após criar/gerar: para o botão do WhatsApp e "copiar link". */
  convite: { nome: string; link: string; whatsappUrl: string; mensagem: string } | null;
}

export const CONVITE_INITIAL_STATE: ConviteState = { ok: false, error: null, convite: null };
