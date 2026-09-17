import "server-only";

import { headers } from "next/headers";

/**
 * Resolve a URL base do app para montar links absolutos (e-mail de
 * recuperação, convite de administrador). Deriva do header `origin`/`host`
 * da própria requisição (robusto em local, preview e produção), com fallback
 * para `APP_BASE_URL` quando o header não estiver disponível.
 */
export async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();

  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? "https";
    return `${protocol}://${host}`;
  }

  return process.env.APP_BASE_URL ?? "";
}
