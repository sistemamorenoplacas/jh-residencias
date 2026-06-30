import "server-only";

import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Clients Supabase server-only.
 *
 * - `createServiceClient()`: usa a SERVICE ROLE KEY. IGNORA RLS. Use em
 *   cron, webhooks e repositórios de sistema. Nunca exponha ao browser.
 * - `createServerClient()`: usa o anon key ligado aos cookies do Next, então
 *   RESPEITA RLS via `auth.uid()`. Use em leituras autenticadas do painel.
 *
 * Este módulo é `server-only` — o bundler emite erro se algum arquivo client
 * tentar importá-lo.
 */

/**
 * Client com service role. Ignora RLS — restrito ao backend.
 * Sessões desativadas (não há usuário; é um ator de sistema).
 */
export function createServiceClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Client SSR ligado aos cookies do request. Respeita RLS (escopo do usuário
 * logado). Para leituras autenticadas em Server Components / Server Actions.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv();
  const cookieStore = await cookies();

  return createSsrServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` chamado de um Server Component (cookies read-only).
            // Pode ser ignorado se o refresh de sessão acontece no proxy.
          }
        },
      },
    },
  );
}
