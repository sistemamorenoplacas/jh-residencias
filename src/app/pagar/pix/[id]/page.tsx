import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { createServiceClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";
import type { ChargeStatusDb } from "@/lib/db-types";
import { getSettings } from "@/lib/settings";
import { CopyPixButton } from "./CopyPixButton";

// Status pode mudar (pago via webhook) — nunca cachear a página.
export const dynamic = "force-dynamic";

/** UUID do Postgres; evita bater no banco com id inválido. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shape mínimo do charge para a página pública (sem PII além do 1º nome). */
interface ChargePublica {
  owner_id: string;
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
      "owner_id, competencia, vencimento, valor_centavos, status, pix_copia_cola, link_pagamento, leases(properties(nome), tenants(nome))",
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

/** Gera o QR Code do Pix copia-e-cola como data URL PNG (server-side). */
async function gerarQrDataUrl(pix: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(pix, {
      margin: 0,
      width: 240,
      errorCorrectionLevel: "M",
      color: { dark: "#052351", light: "#ffffff" },
    });
  } catch {
    return null;
  }
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

  const settings = await getSettings(charge.owner_id);

  const emAberto = charge.status === "pendente" || charge.status === "vencido";
  const qrDataUrl =
    emAberto && charge.pix_copia_cola
      ? await gerarQrDataUrl(charge.pix_copia_cola)
      : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--color-canvas)] px-4 py-8">
      <Skyline />
      <div className="relative mx-auto w-full max-w-lg">
        {!emAberto && (
          <div className="mb-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="JH Residências" className="h-24 w-auto" />
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-[0_24px_70px_-28px_rgba(5,35,81,0.35)] sm:p-8">
          <PixContent
            charge={charge}
            nome={nome}
            imovel={imovel}
            valor={valor}
            competencia={competencia}
            vencimento={vencimento}
            qrDataUrl={qrDataUrl}
            suporteWhatsapp={settings.suporteWhatsapp}
            suporteEmail={settings.suporteEmail}
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
  qrDataUrl,
  suporteWhatsapp,
  suporteEmail,
}: {
  charge: ChargePublica;
  nome: string;
  imovel: string;
  valor: string;
  competencia: string;
  vencimento: string;
  qrDataUrl: string | null;
  suporteWhatsapp: string;
  suporteEmail: string;
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

  return (
    <div>
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
            {nome ? `Olá, ${nome}!` : "Pagamento de aluguel"}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            {imovel ? `${imovel} · ` : ""}Aluguel de {competencia}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="JH Residências"
          className="h-32 w-auto shrink-0"
        />
      </header>

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand)] px-6 py-6 text-center text-white">
        <ValueDecor />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          Valor a pagar
        </p>
        <p className="tnum relative mt-1 text-4xl font-bold">{valor}</p>
        <p className="relative mt-1.5 text-sm text-white/80">
          Vencimento em{" "}
          <span className="font-semibold text-white">{vencimento}</span>
        </p>
      </div>

      <section className="mt-7">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-brand)]">
          Pague com Pix
        </h2>

        <div className="mt-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-canvas)]/50 p-4">
          <div className="flex items-start gap-4">
            {qrDataUrl && (
              <div className="shrink-0 rounded-xl border border-[var(--color-line)] bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR Code Pix"
                  width={112}
                  height={112}
                  className="size-28"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-ink-soft)]">
                Copie o código Pix ou escaneie o QR Code
              </p>
              <p className="tnum mt-2 max-h-20 overflow-auto break-all rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
                {charge.pix_copia_cola}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-faint)]">
                <IconCopy className="size-3.5" />
                Código Pix copia e cola
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <CopyPixButton codigo={charge.pix_copia_cola ?? ""} />

          {charge.link_pagamento && (
            <a
              href={charge.link_pagamento}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-line-strong)] bg-white px-5 py-3.5 text-sm font-semibold text-[var(--color-brand-dark)] transition hover:bg-[var(--color-canvas)]"
            >
              <IconHandshake className="size-4" />
              Abrir QR Code no Mercado Pago
            </a>
          )}
        </div>
      </section>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[var(--color-canvas)] px-4 py-3">
        <IconShield className="size-6 shrink-0 text-[var(--color-brand)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--color-ink)]">
            Pagamento seguro
          </p>
          <p className="text-[11px] leading-snug text-[var(--color-muted)]">
            Seus pagamentos são processados com segurança via Mercado Pago.
          </p>
        </div>
        <MercadoPagoLogo />
      </div>

      <div className="mt-5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-brand)]">
          <IconHelp className="size-4" />
          Precisa de ajuda?
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">
          Fale conosco pelo WhatsApp {suporteWhatsapp} ou pelo e-mail{" "}
          {suporteEmail}
        </p>
      </div>
    </div>
  );
}

// --- Decorações e ícones ----------------------------------------------------

/** Silhueta de prédios bem sutil no fundo, atrás do cartão. */
function Skyline() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-64 w-full text-[var(--color-brand)] opacity-[0.05]"
      viewBox="0 0 400 120"
      preserveAspectRatio="xMidYMax slice"
      fill="currentColor"
    >
      <rect x="20" y="60" width="24" height="60" />
      <rect x="50" y="40" width="30" height="80" />
      <rect x="86" y="72" width="20" height="48" />
      <rect x="150" y="30" width="34" height="90" />
      <rect x="190" y="55" width="24" height="65" />
      <rect x="220" y="20" width="28" height="100" />
      <rect x="300" y="48" width="30" height="72" />
      <rect x="336" y="66" width="22" height="54" />
      <rect x="364" y="36" width="26" height="84" />
    </svg>
  );
}

/** Linhas geométricas sutis no canto da caixa de valor. */
function ValueDecor() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-white/10"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M100 0 L40 100 M100 20 L55 100 M100 40 L70 100 M100 60 L85 100" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconHandshake({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** Selo oficial do Mercado Pago (marca do parceiro de pagamento). */
function MercadoPagoLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mercado-pago.svg"
      alt="Mercado Pago"
      className="h-9 w-auto shrink-0"
    />
  );
}
