import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Guard de sessão do painel.
 *
 * Refaz a sessão Supabase em todo request coberto pelo matcher e protege o
 * grupo (painel): sem sessão => redireciona para /login.
 *
 * Fora do guard: páginas públicas (`/login`, `/pagar/*` — pagamento pelo
 * inquilino sem sessão, `/politica-de-privacidade`) e `/api/*` (webhooks/cron,
 * que se autenticam por assinatura/CRON_SECRET, não por cookie de sessão).
 *
 * Nota Next 16: `middleware` foi renomeado para `proxy` (deprecado mas
 * funcional). Mantido como `middleware.ts` por ser o contrato esperado pelos
 * demais agentes; migração para `proxy.ts` é um follow-up.
 */

const PUBLIC_PATHS = ["/login", "/pagar", "/politica-de-privacidade"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Cobre todas as rotas EXCETO:
     * - api            (webhooks/cron — autenticam por assinatura/CRON_SECRET)
     * - _next/static   (arquivos estáticos)
     * - _next/image    (otimização de imagem)
     * - favicon.ico, sitemap.xml, robots.txt (metadados)
     * - arquivos com extensão (imagens, fontes, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
