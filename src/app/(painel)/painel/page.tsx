import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { ChargesTable } from "@/components/charges/ChargesTable";
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
const IconClock = (
  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
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

async function carregarCobrancasDoMes(): Promise<ChargeRow[]> {
  try {
    return await buscarChargeRowsDoMes();
  } catch {
    // Falha de leitura (banco indisponível / sessão expirada): degrada para
    // painel vazio em vez de derrubar a página.
    return [];
  }
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

  return (
    <AppShell
      title="Visão geral"
      subtitle={subtitle}
      actions={
        <Link
          href="/cobrancas"
          className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {IconPlus}
          <span className="hidden sm:inline">Nova cobrança</span>
          <span className="sm:hidden">Nova</span>
        </Link>
      }
    >
      {/* Bento editorial: herói dominante + trilho de indicadores */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MetricCard
            variant="hero"
            label="A receber no mês"
            value={formatBRL(kpis.aReceberCentavos)}
            icon={IconWallet}
            tone="text-brand"
            hint={`${charges.length} ${charges.length === 1 ? "cobrança em aberto" : "cobranças no mês"}`}
          />
        </div>
        <MetricCard
          label="Recebido"
          value={formatBRL(kpis.recebidoCentavos)}
          icon={IconCheck}
          tone="text-brand"
          progress={kpis.recebidoPct}
          hint="do total do mês"
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Pendente + Vencido"
          value={formatBRL(kpis.pendenteCentavos)}
          icon={IconClock}
          tone="text-signal"
          spark={tendencias.recebido}
        />
        <MetricCard
          label="Inadimplência"
          value={`${kpis.inadimplenciaPct}%`}
          icon={IconAlert}
          tone="text-vencido"
          spark={tendencias.inadimplencia}
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between border-b border-line-strong pb-3">
          <div className="flex items-center gap-3">
            <span className="section-index">02</span>
            <h2 className="serif text-xl text-ink">Cobranças recentes</h2>
          </div>
          <Link
            href="/cobrancas"
            className="font-mono text-[11px] uppercase tracking-wider text-brand transition-colors hover:text-brand-dark"
          >
            Ver todas →
          </Link>
        </div>
        {recentes.length > 0 ? (
          <ChargesTable rows={recentes} />
        ) : (
          <div className="card-surface blueprint px-6 py-14 text-center">
            <p className="serif text-lg text-ink">Nenhuma cobrança neste mês</p>
            <p className="mt-1.5 text-sm text-muted">
              As cobranças do mês corrente aparecerão aqui assim que forem geradas.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
