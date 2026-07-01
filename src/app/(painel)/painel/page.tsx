import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ChargesTable } from "@/components/charges/ChargesTable";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { formatBRL } from "@/lib/money";
import { formatCompetencia } from "@/lib/dates";
import { competenciaAtual } from "@/lib/charge-generation";
import { buscarChargeRowsDoMes } from "@/lib/charges-query";
import { buscarTendencias6Meses } from "@/lib/dashboard";
import { computeKpis } from "@/lib/mock";
import type { ChargeRow } from "@/lib/types";

export const metadata: Metadata = { title: "Visão Geral — JH Residências" };

const IconWallet = (
  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14h2" />
  </svg>
);
const IconCheck = (
  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconAlert = (
  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);
const IconPlus = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconHouse = (
  <svg className="size-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" />
  </svg>
);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Rótulos dos últimos 6 meses (mais antigo → atual), coerentes com as tendências. */
function labels6Meses(hoje: Date): string[] {
  const out: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push(MESES[d.getMonth()]);
  }
  return out;
}

async function carregarCobrancasDoMes(): Promise<ChargeRow[]> {
  try {
    return await buscarChargeRowsDoMes();
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  icon,
  hint,
  mint = false,
  tone = "text-brand",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint: string;
  mint?: boolean;
  tone?: string;
}) {
  return (
    <div className={`card-surface rise p-5 ${mint ? "bg-mint" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`flex size-7 items-center justify-center rounded-lg bg-current/10 ${tone}`}>
          {icon}
        </span>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
      <p className="num-hero mt-4 text-4xl text-ink">{value}</p>
      <p className="mt-2 text-xs text-faint">{hint}</p>
    </div>
  );
}

function SummaryRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className="size-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className="text-sm font-semibold text-ink tnum">{value}</span>
    </div>
  );
}

export default async function PainelPage() {
  const hoje = new Date();
  const [charges, tendencias] = await Promise.all([
    carregarCobrancasDoMes(),
    buscarTendencias6Meses(hoje),
  ]);
  const kpis = computeKpis(charges);
  const recentes = charges.slice(0, 5);
  const subtitle = formatCompetencia(competenciaAtual(hoje));
  const labels = labels6Meses(hoje);

  return (
    <AppShell title="Visão geral" subtitle={subtitle}>
      {/* Banner */}
      <section
        className="rise relative mb-5 overflow-hidden rounded-card px-7 py-8 text-white"
        style={{ background: "linear-gradient(115deg,#041a3d 0%,#052351 55%,#0e3a75 100%)" }}
      >
        <div className="relative z-10 max-w-md">
          <h2 className="serif text-2xl leading-tight lg:text-[28px]">
            Gerencie seus aluguéis num só lugar.
          </h2>
          <p className="mt-1.5 text-sm text-white/70">
            Gere cobranças, acompanhe pagamentos e reduza a inadimplência.
          </p>
          <Link
            href="/cobrancas"
            className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-white/90"
          >
            {IconPlus}
            Nova cobrança
          </Link>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-4 text-white/10">
          {IconHouse}
        </div>
      </section>

      {/* Grid principal + coluna direita */}
      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr]">
            <div className="flex flex-col gap-5">
              <StatCard
                label="A receber no mês"
                value={formatBRL(kpis.aReceberCentavos)}
                icon={IconWallet}
                tone="text-brand"
                hint={`${charges.length} ${charges.length === 1 ? "cobrança" : "cobranças"} no mês`}
              />
              <StatCard
                label="Recebido"
                value={formatBRL(kpis.recebidoCentavos)}
                icon={IconCheck}
                tone="text-pago"
                mint
                hint={`${kpis.recebidoPct}% do total do mês`}
              />
            </div>

            <div className="card-surface rise p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Recebido vs Inadimplência</p>
                  <p className="text-xs text-faint">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2 rounded-full" style={{ background: "#15a34a" }} />
                    Recebido
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2 rounded-full" style={{ background: "#9ca3af" }} />
                    Inadimpl.
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <RevenueChart
                  labels={labels}
                  unit="%"
                  series={[
                    { name: "Recebido", color: "#15a34a", data: tendencias.recebido },
                    { name: "Inadimplência", color: "#9ca3af", data: tendencias.inadimplencia },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Cobranças recentes */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="serif text-lg text-ink">Cobranças recentes</h2>
              <Link
                href="/cobrancas"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                Ver todas →
              </Link>
            </div>
            {recentes.length > 0 ? (
              <ChargesTable rows={recentes} />
            ) : (
              <div className="card-surface px-6 py-14 text-center">
                <p className="serif text-lg text-ink">Nenhuma cobrança neste mês</p>
                <p className="mt-1.5 text-sm text-muted">
                  As cobranças do mês aparecerão aqui assim que forem geradas.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Coluna direita — resumo + atalhos */}
        <div className="flex flex-col gap-5">
          <div className="card-surface rise p-5">
            <p className="text-sm font-semibold text-ink">Resumo do mês</p>
            <div className="mt-2 divide-y divide-line">
              <SummaryRow label="A receber" value={formatBRL(kpis.aReceberCentavos)} dot="#0e3a75" />
              <SummaryRow label="Recebido" value={formatBRL(kpis.recebidoCentavos)} dot="#15a34a" />
              <SummaryRow label="Pendente + vencido" value={formatBRL(kpis.pendenteCentavos)} dot="#d97706" />
            </div>
          </div>

          <div className="card-surface rise flex items-start gap-3 p-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-vencido-tint text-vencido">
              {IconAlert}
            </span>
            <div>
              <p className="num-hero text-2xl text-ink">{kpis.inadimplenciaPct}%</p>
              <p className="text-xs text-faint">de inadimplência no mês</p>
            </div>
          </div>

          <div className="card-surface rise p-5">
            <p className="text-sm font-semibold text-ink">Atalhos</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/cobrancas" className="btn-ghost justify-start">Ver cobranças</Link>
              <Link href="/inquilinos" className="btn-ghost justify-start">Inquilinos</Link>
              <Link href="/contratos" className="btn-ghost justify-start">Contratos</Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
