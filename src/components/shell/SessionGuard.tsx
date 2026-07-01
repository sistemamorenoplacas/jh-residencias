"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Escuta eventos de auth do Supabase no lado cliente.
 * Quando a sessão expira (SIGNED_OUT), redireciona para o login
 * em vez de deixar a página quebrar silenciosamente.
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          router.push("/login?sessionExpired=1");
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
