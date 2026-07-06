import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";
import type { ChargeStatusDb } from "@/lib/db-types";
import { CopyPixButton } from "./CopyPixButton";

// Status pode mudar (pago via webhook) — nunca cachear a página.
export const dynamic = "force-dynamic";

/** UUID v4 do Postgres; evita bater no banco com id inválido. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shape mínimo do charge para a página pública (sem PII além do 1º nome). */
interface ChargePublica {
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  status: ChargeStatusDb;
  pix_copia_cola: string | null;
  link_pagamento: string | null;
  leases: {
    properties: { nome: string } | null;
    tenants: { nome: string } | null;
  } | null;
}

async function buscarCharge(id: string): Promise<ChargePublica | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("charges")
    .select(
      "competencia, vencimento, valor_centavos, status, pix_copia_cola, link_pagamento, leases(properties(nome), tenants(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ChargePublica;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Pagar aluguel via Pix — JH Residências" };
}

/** Primeiro nome, para uma saudação amigável. */
function primeiroNome(nome: string | undefined | null): string {
  if (!nome) return "";
  return nome.trim().split(/\s+/)[0] ?? "";
}

export default async function PagarPixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const charge = await buscarCharge(id);
  if (!charge) notFound();

  const nome = primeiroNome(charge.leases?.tenants?.nome);
  const imovel = charge.leases?.properties?.nome ?? "";
  const valor = formatBRL(charge.valor_centavos);
  const competencia = formatCompetencia(charge.competencia);
  const vencimento = formatData(charge.vencimento);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-canvas)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="JH Residências" className="h-28 w-auto" />
        </div>

        <div className="card-surface overflow-hidden p-6 sm:p-8">
          <PixContent
            charge={charge}
            nome={nome}
            imovel={imovel}
            valor={valor}
            competencia={competencia}
            vencimento={vencimento}
          />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-faint)]">
          Pagamento processado com segurança via Mercado Pago.
        </p>
      </div>
    </main>
  );
}

function PixContent({
  charge,
  nome,
  imovel,
  valor,
  competencia,
  vencimento,
}: {
  charge: ChargePublica;
  nome: string;
  imovel: string;
  valor: string;
  competencia: string;
  vencimento: string;
}) {
  if (charge.status === "pago") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--color-pago-tint)] text-2xl text-[var(--color-pago)]">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Pagamento confirmado
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          O aluguel de {competencia} ({valor}) já consta como pago. Obrigado!
        </p>
      </div>
    );
  }

  if (charge.status === "cancelado") {
    return (
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Cobrança cancelada
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Esta cobrança foi cancelada. Em caso de dúvida, fale com a
          administração.
        </p>
      </div>
    );
  }

  const temPix = Boolean(charge.pix_copia_cola);

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          {nome ? `Olá, ${nome}!` : "Pagamento de aluguel"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {imovel ? `${imovel} · ` : ""}Aluguel de {competencia}
        </p>
      </header>

      <div className="mb-6 rounded-xl bg-[var(--color-brand-tint)] px-5 py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand)]">
          Valor a pagar
        </p>
        <p className="tnum mt-1 text-3xl font-bold text-[var(--color-brand-dark)]">
          {valor}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Vencimento em {vencimento}
        </p>
      </div>

      {temPix ? (
        <div className="space-y-4">
          <div>
            <p className="label mb-1">Pix copia e cola</p>
            <p className="tnum max-h-28 overflow-auto break-all rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-4 py-3 text-xs text-[var(--color-ink-soft)]">
              {charge.pix_copia_cola}
            </p>
          </div>

          <CopyPixButton codigo={charge.pix_copia_cola ?? ""} />

          {charge.link_pagamento && (
            <a
              href={charge.link_pagamento}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost block w-full text-center"
            >
              Abrir QR Code no Mercado Pago
            </a>
          )}

          <p className="text-center text-xs text-[var(--color-muted)]">
            Abra o app do seu banco, escolha pagar com Pix e cole o código
            acima.
          </p>
        </div>
      ) : charge.link_pagamento ? (
        <a
          href={charge.link_pagamento}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-[var(--color-brand-dark)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-brand)]"
        >
          Pagar no Mercado Pago
        </a>
      ) : (
        <p className="text-center text-sm text-[var(--color-muted)]">
          O código de pagamento ainda está sendo gerado. Tente novamente em
          alguns instantes ou fale com a administração.
        </p>
      )}
    </div>
  );
}
