import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (antigo middleware) — guard de sessão do painel + domínio de pagamento.
 *
 * Refaz a sessão Supabase em todo request coberto pelo matcher e protege o
 * grupo (painel): sem sessão => redireciona para /login.
 *
 * Fora do guard: páginas públicas (`/login`, `/pagar/*` — pagamento pelo
 * inquilino sem sessão, `/politica-de-privacidade`) e `/api/*` (webhooks/cron,
 * que se autenticam por assinatura/CRON_SECRET, não por cookie de sessão).
 *
 * Domínio de pagamento (`PAY_HOST`, ex.: pay.jhresidencias.com): no mesmo
 * deploy, `https://PAY_HOST/pix/:id` e `/boleto/:id` são reescritos para as
 * páginas em `/pagar/...`; qualquer outro caminho nesse host volta para o
 * site principal. No domínio principal, `/pagar/*` redireciona para o
 * domínio de pagamento. Sem `PAY_HOST` definido, nada disso acontece.
 *
 * Next 16: convenção `proxy.ts` / `export function proxy` (o antigo
 * `middleware.ts` deixou de ser executado no dev server 16.2).
 */

const PUBLIC_PATHS = ["/login", "/pagar", "/politica-de-privacidade"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

const PAY_HOST = process.env.PAY_HOST?.trim().toLowerCase() || null;
const PAGAMENTO_RE = /^\/(pix|boleto)\/([^/]+)\/?$/;

function hostDaRequest(request: NextRequest): string {
  const raw = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
}

/** Roteamento do domínio de pagamento; `null` quando não se aplica. */
function rotearPagamento(request: NextRequest, pathname: string): NextResponse | null {
  if (!PAY_HOST) return null;

  if (hostDaRequest(request) === PAY_HOST) {
    const match = pathname.match(PAGAMENTO_RE);
    if (match) {
      const url = request.nextUrl.clone();
      url.pathname = `/pagar/${match[1]}/${match[2]}`;
      return NextResponse.rewrite(url);
    }
    // Links antigos (`/pagar/...`) continuam funcionando no domínio de pagamento.
    if (pathname.startsWith("/pagar/")) return NextResponse.next();
    return NextResponse.redirect(process.env.APP_BASE_URL ?? "https://www.jhresidencias.com");
  }

  if (pathname.startsWith("/pagar/")) {
    const destino = new URL(pathname.slice("/pagar".length), `https://${PAY_HOST}`);
    destino.search = request.nextUrl.search;
    return NextResponse.redirect(destino, 308);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pagamento = rotearPagamento(request, pathname);
  if (pagamento) return pagamento;

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
