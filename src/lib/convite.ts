/**
 * Convite de administrador — parte pura (sem I/O): monta o link de ativação,
 * a mensagem e a URL do WhatsApp. Testado em `convite.test.ts`.
 */

/** Tipos de token de uso único aceitos na ativação (`auth.verifyOtp`). */
export const TIPOS_CONVITE = ["invite", "magiclink"] as const;
export type TipoConvite = (typeof TIPOS_CONVITE)[number];

export function isTipoConvite(value: unknown): value is TipoConvite {
  return typeof value === "string" && (TIPOS_CONVITE as readonly string[]).includes(value);
}

/** URL pública da página de ativação (`/login/convite`). */
export function montarLinkConvite(baseUrl: string, tokenHash: string, tipo: TipoConvite): string {
  const url = new URL("/login/convite", baseUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", tipo);
  return url.toString();
}

/**
 * Normaliza um telefone brasileiro para o formato do wa.me (só dígitos, com
 * DDI 55). Retorna `null` quando não há dígitos suficientes.
 */
export function normalizarTelefoneWhatsapp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

/** Texto enviado pelo WhatsApp ao novo administrador. */
export function mensagemConvite(nome: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "tudo bem";
  return [
    `Olá, ${primeiro}! Você agora é administrador(a) do *JH Residências*, o sistema de gestão dos aluguéis.`,
    "",
    "Toque no link para ativar seu acesso e criar sua senha:",
    link,
    "",
    "O link é pessoal e de uso único. Se expirar, é só me pedir outro.",
  ].join("\n");
}

/** URL do WhatsApp com a mensagem pronta; sem telefone, o WhatsApp pede o contato. */
export function urlWhatsappConvite(telefone: string | null | undefined, mensagem: string): string {
  const numero = normalizarTelefoneWhatsapp(telefone);
  const texto = encodeURIComponent(mensagem);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
