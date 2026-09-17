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
 */
const schema = z.object({
  chargeId: z.string().uuid(),
  pagina: z.enum(["pix", "boleto"]),
});

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

  await supabase.from("charge_link_views").insert({
    charge_id: charge.id,
    owner_id: charge.owner_id,
    pagina: parsed.data.pagina,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  return new NextResponse(null, { status: 204 });
}
