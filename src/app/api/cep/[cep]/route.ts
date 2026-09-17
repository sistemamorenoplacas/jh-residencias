import { NextResponse } from "next/server";

import { mapearRespostaCep, somenteDigitosCep } from "@/lib/cep";

/**
 * GET /api/cep/01001000 — consulta o CEP no ViaCEP (com BrasilAPI como
 * reserva) e devolve `{ logradouro, bairro, cidade, uf }`. Feito no servidor
 * para não abrir a CSP do painel a domínios externos. Cache de 1 dia.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ cep: string }> }) {
  const { cep } = await ctx.params;
  const digitos = somenteDigitosCep(cep);
  if (digitos.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const fontes = [
    `https://viacep.com.br/ws/${digitos}/json/`,
    `https://brasilapi.com.br/api/cep/v1/${digitos}`,
  ];

  for (const url of fontes) {
    try {
      const res = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4_000) });
      if (!res.ok) continue;
      const endereco = mapearRespostaCep(await res.json());
      if (endereco) {
        return NextResponse.json(endereco, {
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      }
      // ViaCEP responde 200 com { erro: true } para CEP inexistente.
      if (url.includes("viacep")) break;
    } catch {
      // tenta a próxima fonte
    }
  }

  return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
}
