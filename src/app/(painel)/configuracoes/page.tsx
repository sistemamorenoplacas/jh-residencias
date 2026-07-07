import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";
import { GerarCobrancasButton } from "@/components/config/GerarCobrancasButton";

export const metadata: Metadata = { title: "Configurações — JH Residências" };

// Lê secrets só para reportar presença — nenhum valor atravessa a fronteira.
export const dynamic = "force-dynamic";

/** Contato de suporte exibido nas páginas de pagamento. */
const SUPORTE_WHATSAPP = "(31) 99999-9999";
const SUPORTE_EMAIL = "financeiro@jhresidencias.com.br";

function temEnv(...nomes: string[]): boolean {
  return nomes.every((n) => {
    const v = process.env[n];
    return typeof v === "string" && v.trim().length > 0;
  });
}

interface Conexao {
  nome: string;
  descricao: string;
  ok: boolean;
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-pago-tint text-pago" : "bg-pendente-tint text-pendente"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ok ? "Conectado" : "Pendente"}
    </span>
  );
}

function IconCheck() {
  return (
    <svg
      className="mt-0.5 size-4 shrink-0 text-pago"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AutomacaoItem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <li className="flex items-start gap-3">
      <IconCheck />
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">{titulo}</span> — {texto}
      </p>
    </li>
  );
}

export default function ConfiguracoesPage() {
  const conexoes: Conexao[] = [
    {
      nome: "Pix (Mercado Pago)",
      descricao: "Geração de Pix/boleto e confirmação de pagamento.",
      ok: temEnv("MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"),
    },
    {
      nome: "WhatsApp",
      descricao: "Envio de cobranças, lembretes e confirmações.",
      ok: temEnv("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"),
    },
    {
      nome: "Banco de dados",
      descricao: "Imóveis, inquilinos, contratos e cobranças.",
      ok: temEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"),
    },
  ];

  return (
    <AppShell
      title="Configurações"
      subtitle="Automação e conexões do sistema"
    >
      <div className="flex flex-col gap-6">
        {/* Automação de cobranças */}
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-ink">
                Cobrança automática
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                O sistema cobra seus inquilinos sozinho, todo mês.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-pago-tint px-2.5 py-1 text-xs font-semibold text-pago">
              <span className="size-1.5 rounded-full bg-current" />
              Ativa
            </span>
          </header>

          <div className="px-5 py-4">
            <ul className="flex flex-col gap-3">
              <AutomacaoItem
                titulo="Todo dia 1º"
                texto="as cobranças do mês são geradas para cada contrato ativo, com o Pix (e boleto, quando há endereço) enviado por WhatsApp."
              />
              <AutomacaoItem
                titulo="Lembretes automáticos"
                texto="enviados 3 dias antes do vencimento, no dia do vencimento e após o atraso."
              />
              <AutomacaoItem
                titulo="Baixa automática"
                texto="quando o pagamento cai, a cobrança é marcada como paga na hora — sem você fazer nada."
              />
            </ul>

            <div className="mt-5 rounded-xl bg-canvas px-4 py-4">
              <p className="text-sm font-medium text-ink">
                Precisa cobrar agora, sem esperar o dia 1º?
              </p>
              <p className="mb-3 mt-0.5 text-xs text-muted">
                Gera as cobranças do mês atual para todos os contratos ativos.
                Quem já foi cobrado neste mês é ignorado (não recebe de novo).
              </p>
              <GerarCobrancasButton />
            </div>
          </div>
        </section>

        {/* Conexões */}
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Conexões
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Serviços que fazem o sistema funcionar. Todos precisam estar
              conectados.
            </p>
          </header>
          <ul className="divide-y divide-line">
            {conexoes.map((c) => (
              <li
                key={c.nome}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{c.nome}</p>
                  <p className="text-xs text-faint">{c.descricao}</p>
                </div>
                <StatusPill ok={c.ok} />
              </li>
            ))}
          </ul>
        </section>

        {/* Contato de suporte */}
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Contato de suporte
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Aparece para o inquilino nas páginas de pagamento (Pix e boleto).
            </p>
          </header>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                WhatsApp
              </p>
              <p className="mt-1 font-medium text-ink">{SUPORTE_WHATSAPP}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                E-mail
              </p>
              <p className="mt-1 font-medium text-ink">{SUPORTE_EMAIL}</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
