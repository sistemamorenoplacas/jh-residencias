import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refaz a sessão Supabase a cada request (padrão oficial supabase-ssr para
 * Next). Lê/escreve cookies no par request/response para manter o token
 * fresco. Retorna `{ response, user }`:
 * - `response`: o NextResponse com os cookies de sessão atualizados.
 * - `user`: o usuário autenticado (ou null) para o guard decidir redirecionar.
 *
 * Chamado pelo `middleware.ts` da raiz. NUNCA rode lógica entre `createServerClient`
 * e `getUser()` — pode dessincronizar a sessão.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string } | null;
}> {
  let response = NextResponse.next({ request });

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user: user ? { id: user.id } : null };
}
