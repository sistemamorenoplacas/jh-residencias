import "server-only";

import { headers } from "next/headers";

/**
 * Resolve a URL base do app para montar links absolutos (e-mail de
 * recuperação, convite de administrador).
 *
 * `APP_BASE_URL` é a fonte confiável (configurada no deploy): links de reset
 * e convite nunca devem depender de headers controláveis pelo cliente. Os
 * headers `origin`/`host` só entram como fallback quando a variável não está
 * definida (dev local / preview).
 */
export async function resolveBaseUrl(): Promise<string> {
  const configurada = process.env.APP_BASE_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");

  const headerList = await headers();

  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? "https";
    return `${protocol}://${host}`;
  }

  return "";
}
