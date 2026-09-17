import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/rastreio/abertura — registra que o inquilino abriu a página de
 * pagamento. Chamado pelo navegador (beacon) depois da hidratação, então
 * pré-visualizações de link e robôs simples não contam.
 *
 * Público (o id da cobrança é um UUID não enumerável). Responde 204 sempre,
 * inclusive para ids desconhecidos, para não revelar se uma cobrança existe.
 *
 * Anti-abuso: como qualquer pessoa com o link pode chamar a rota, uma
 * cobrança acumula no máximo `LIMITE_ABERTURAS_POR_COBRANCA` registros e
 * repetições do mesmo navegador dentro de `JANELA_DEDUPE_MS` são ignoradas —
 * o painel só precisa saber "abriu / quantas vezes / quando".
 */
const schema = z.object({
  chargeId: z.string().uuid(),
  pagina: z.enum(["pix", "boleto"]),
});

const LIMITE_ABERTURAS_POR_COBRANCA = 50;
const JANELA_DEDUPE_MS = 60_000;
const USER_AGENT_MAX = 300;

interface AberturaRecente {
  user_agent: string | null;
  created_at: string;
}

/** Já bateu no teto, ou o mesmo navegador registrou há menos de 1 minuto. */
function deveIgnorar(recentes: AberturaRecente[], userAgent: string | null, agora: Date): boolean {
  if (recentes.length >= LIMITE_ABERTURAS_POR_COBRANCA) return true;
  const limite = agora.getTime() - JANELA_DEDUPE_MS;
  return recentes.some(
    (r) => r.user_agent === userAgent && Date.parse(r.created_at) >= limite,
  );
}

export async function POST(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = schema.safeParse(corpo);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const supabase = createServiceClient();
  const { data: charge } = await supabase
    .from("charges")
    .select("id, owner_id")
    .eq("id", parsed.data.chargeId)
    .maybeSingle();
  if (!charge) return new NextResponse(null, { status: 204 });

  const userAgent = request.headers.get("user-agent")?.slice(0, USER_AGENT_MAX) ?? null;
  const { data: recentes } = await supabase
    .from("charge_link_views")
    .select("user_agent, created_at")
    .eq("charge_id", charge.id)
    .order("created_at", { ascending: false })
    .limit(LIMITE_ABERTURAS_POR_COBRANCA);
  if (deveIgnorar((recentes ?? []) as AberturaRecente[], userAgent, new Date())) {
    return new NextResponse(null, { status: 204 });
  }

  await supabase.from("charge_link_views").insert({
    charge_id: charge.id,
    owner_id: charge.owner_id,
    pagina: parsed.data.pagina,
    user_agent: userAgent,
  });

  return new NextResponse(null, { status: 204 });
}
