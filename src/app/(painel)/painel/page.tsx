import { AppShell } from "@/components/shell/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ChargesTable } from "@/components/charges/ChargesTable";
import { formatBRL } from "@/lib/money";
import { formatCompetencia } from "@/lib/dates";
import { competenciaAtual } from "@/lib/charge-generation";
import { buscarChargeRowsDoMes } from "@/lib/charges-query";
import { computeKpis, SPARK_RECEBIDO, SPARK_INADIMPLENCIA } from "@/lib/mock";
import type { ChargeRow } from "@/lib/types";

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
  const charges = await carregarCobrancasDoMes();
  const kpis = computeKpis(charges);
  const recentes = charges.slice(0, 5);
  const subtitle = formatCompetencia(competenciaAtual(hoje));

  return (
    <AppShell
      title="Visão geral"
      subtitle={subtitle}
      actions={
        <PrimaryButton icon={IconPlus}>
          <span className="hidden sm:inline">Nova cobrança</span>
          <span className="sm:hidden">Nova</span>
        </PrimaryButton>
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          label="A receber no mês"
          value={formatBRL(kpis.aReceberCentavos)}
          icon={IconWallet}
          tone="text-ink"
          hint={`${charges.length} ${charges.length === 1 ? "cobrança" : "cobranças"}`}
        />
        <MetricCard
          label="Recebido"
          value={formatBRL(kpis.recebidoCentavos)}
          icon={IconCheck}
          tone="text-brand"
          progress={kpis.recebidoPct}
          hint={`${kpis.recebidoPct}% do total`}
        />
        <MetricCard
          label="Pendente"
          value={formatBRL(kpis.pendenteCentavos)}
          icon={IconClock}
          tone="text-pendente"
          spark={SPARK_RECEBIDO}
        />
        <MetricCard
          label="Inadimplência"
          value={`${kpis.inadimplenciaPct}%`}
          icon={IconAlert}
          tone="text-vencido"
          spark={SPARK_INADIMPLENCIA}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Cobranças recentes</h2>
          <a href="/cobrancas" className="text-sm font-medium text-brand hover:text-brand-dark">
            Ver todas
          </a>
        </div>
        {recentes.length > 0 ? (
          <ChargesTable rows={recentes} />
        ) : (
          <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">Nenhuma cobrança neste mês</p>
            <p className="mt-1 text-sm text-muted">
              As cobranças do mês corrente aparecerão aqui assim que forem geradas.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
