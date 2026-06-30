"use client";

import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

/**
 * Client Supabase para o browser (anon key). Respeita RLS.
 * Seguro em componentes `'use client'` — usa apenas variáveis NEXT_PUBLIC_.
 */
export function createBrowserClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv();
  return createSsrBrowserClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
