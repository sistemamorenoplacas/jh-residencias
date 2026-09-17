import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/health — verificação de saúde + keep-alive do Supabase.
 *
 * O plano Free do Supabase PAUSA o projeto após 7 dias sem requisições. Esta
 * rota faz uma leitura mínima no banco e é chamada pelo Vercel Cron a cada
 * 6 h (ver `vercel.json`), então o projeto nunca fica ocioso — mesmo que os
 * crons de cobrança/lembrete falhem por outro motivo. Também serve para um
 * monitor externo (UptimeRobot etc.) acompanhar o sistema.
 *
 * Pública e sem dados sensíveis: só devolve se o banco respondeu. Coberta
 * pelo rate limit de `/api/*` no Firewall da Vercel.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const inicio = Date.now();
  const headers = { "Cache-Control": "no-store" };

  try {
    const { error } = await createServiceClient()
      .from("settings")
      .select("owner_id")
      .limit(1);
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { ok: true, db: "ok", ms: Date.now() - inicio, at: new Date().toISOString() },
      { headers },
    );
  } catch (error: unknown) {
    console.error("[health] banco indisponível:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, db: "erro", at: new Date().toISOString() },
      { status: 503, headers },
    );
  }
}
