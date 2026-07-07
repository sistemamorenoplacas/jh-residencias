import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";
import type { ChargeStatusDb } from "@/lib/db-types";
import { getSettings } from "@/lib/settings";
import { CopyPixButton } from "../../pix/[id]/CopyPixButton";

// Status pode mudar (pago via webhook) — nunca cachear a página.
export const dynamic = "force-dynamic";

/** UUID do Postgres; evita bater no banco com id inválido. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ChargeBoletoPublica {
  owner_id: string;
  competencia: string;
  vencimento: string;
  valor_centavos: number;
  status: ChargeStatusDb;
  boleto_url: string | null;
  boleto_linha_digitavel: string | null;
  leases: {
    properties: { nome: string } | null;
    tenants: { nome: string } | null;
  } | null;
}

async function buscarCharge(id: string): Promise<ChargeBoletoPublica | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("charges")
    .select(
      "owner_id, competencia, vencimento, valor_centavos, status, boleto_url, boleto_linha_digitavel, leases(properties(nome), tenants(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ChargeBoletoPublica;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Pagar aluguel via boleto — JH Residências" };
}

function primeiroNome(nome: string | undefined | null): string {
  if (!nome) return "";
  return nome.trim().split(/\s+/)[0] ?? "";
}

export default async function PagarBoletoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const charge = await buscarCharge(id);
  if (!charge) notFound();

  const emAberto = charge.status === "pendente" || charge.status === "vencido";

  // Sem boleto emitido (inquilino sem CPF/endereço, ou charge antiga):
  // cai para o Pix, que sempre existe.
  if (emAberto && !charge.boleto_url) {
    redirect(`/pagar/pix/${id}`);
  }

  const nome = primeiroNome(charge.leases?.tenants?.nome);
  const imovel = charge.leases?.properties?.nome ?? "";
  const valor = formatBRL(charge.valor_centavos);
  const competencia = formatCompetencia(charge.competencia);
  const vencimento = formatData(charge.vencimento);
  const settings = await getSettings(charge.owner_id);

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
          <BoletoContent
            charge={charge}
            nome={nome}
            imovel={imovel}
            valor={valor}
            competencia={competencia}
            vencimento={vencimento}
            chargeId={id}
            suporteWhatsapp={settings.suporteWhatsapp}
            suporteEmail={settings.suporteEmail}
          />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--color-faint)]">
          <IconLock className="size-3.5" />
          Pagamento processado com segurança via Mercado Pago.
        </p>
      </div>
    </main>
  );
}

function BoletoContent({
  charge,
  nome,
  imovel,
  valor,
  competencia,
  vencimento,
  chargeId,
  suporteWhatsapp,
  suporteEmail,
}: {
  charge: ChargeBoletoPublica;
  nome: string;
  imovel: string;
  valor: string;
  competencia: string;
  vencimento: string;
  chargeId: string;
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

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand)] px-6 py-5 text-white">
        <ValueDecor />
        <div className="relative flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <IconBoleto className="size-9 text-white" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Valor a pagar
            </p>
            <p className="tnum mt-0.5 text-3xl font-bold">{valor}</p>
            <p className="mt-0.5 text-sm text-white/80">
              Vencimento em{" "}
              <span className="font-semibold text-white">{vencimento}</span>
            </p>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-canvas)]/50 p-4">
        <div className="flex items-center gap-2">
          <IconBarcode className="size-5 text-[var(--color-brand)]" />
          <h2 className="text-sm font-bold text-[var(--color-brand-dark)]">
            Linha digitável
          </h2>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Utilize a linha digitável para copiar e pagar seu boleto.
        </p>

        {charge.boleto_linha_digitavel && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5">
            <p className="tnum min-w-0 flex-1 break-all text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
              {charge.boleto_linha_digitavel}
            </p>
            <IconCopy className="size-4 shrink-0 text-[var(--color-faint)]" />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {charge.boleto_linha_digitavel && (
            <CopyPixButton
              codigo={charge.boleto_linha_digitavel}
              label="Copiar linha digitável"
              labelCopiado="Linha copiada ✓"
            />
          )}
          {charge.boleto_url && (
            <a
              href={charge.boleto_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-dark)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand)]"
            >
              <IconPrinter className="size-4" />
              Abrir / imprimir boleto
            </a>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--color-brand-tint)] px-4 py-3">
          <IconCalendar className="mt-0.5 size-5 shrink-0 text-[var(--color-brand)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-brand-dark)]">
              Pague até o vencimento
            </p>
            <p className="text-[11px] leading-snug text-[var(--color-ink-soft)]">
              Evite juros e multas. O pagamento após o vencimento pode gerar
              encargos adicionais.
            </p>
          </div>
        </div>
      </section>

      <a
        href={`/pagar/pix/${chargeId}`}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-white px-4 py-3.5 transition hover:bg-[var(--color-canvas)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pix.svg" alt="Pix" className="size-6 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Prefere pagar com Pix?
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Pague de forma instantânea com PIX.
          </p>
        </div>
        <IconChevron className="size-5 shrink-0 text-[var(--color-faint)]" />
      </a>

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

function IconPrinter({ className }: { className?: string }) {
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
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

function IconBarcode({ className }: { className?: string }) {
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
      <path d="M3 5v14M7.5 5v14M12 5v14M16.5 5v14M21 5v14" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
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
      <path d="m9 18 6-6-6-6" />
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

function IconLock({ className }: { className?: string }) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** Documento de boleto (com código de barras) para a caixa de valor. */
function IconBoleto({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M14 2v5h5" />
      <path d="M8 12h8M8 15h8" />
      <path d="M8 18v2M10.5 18v2M13 18v2M15.5 18v2" />
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
