import type { WhatsappStatusDb } from "@/lib/db-types";
import { formatQuando, type AberturasLink } from "@/lib/rastreio";

export interface MensagemRastreio {
  id: string;
  template: string;
  status: WhatsappStatusDb;
  enviadaEm: string;
  entregueEm: string | null;
  lidoEm: string | null;
}

interface ChargeTrackingProps {
  mensagens: MensagemRastreio[];
  aberturas: AberturasLink | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
  cobranca_aluguel: "Cobrança",
  lembrete_vencimento: "Lembrete",
};

const STATUS_LABEL: Record<WhatsappStatusDb, string> = {
  enviado: "Enviada",
  entregue: "Entregue",
  lido: "Lida",
  falhou: "Falhou",
};

function Passo({ ok, titulo, detalhe }: { ok: boolean; titulo: string; detalhe: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-pago-tint text-pago" : "bg-line text-faint"
        }`}
        aria-hidden="true"
      >
        {ok ? (
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${ok ? "text-ink" : "text-muted"}`}>{titulo}</p>
        <p className="text-xs text-faint tnum">{detalhe}</p>
      </div>
    </li>
  );
}

/**
 * Acompanhamento da cobrança: a mensagem mais recente (enviada → entregue →
 * lida) e se o inquilino abriu o link de pagamento.
 */
export function ChargeTracking({ mensagens, aberturas }: ChargeTrackingProps) {
  const ultima = mensagens[0] ?? null;

  return (
    <section className="card-surface p-5">
      <p className="text-sm font-semibold text-ink">Acompanhamento</p>
      <p className="mt-0.5 text-xs text-faint">
        Leitura vem do WhatsApp (o inquilino precisa ter a confirmação de leitura ligada);
        a abertura do link é registrada pela própria página de pagamento.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        <Passo
          ok={ultima !== null && ultima.status !== "falhou"}
          titulo={
            ultima
              ? `${TEMPLATE_LABELS[ultima.template] ?? ultima.template} ${STATUS_LABEL[ultima.status].toLowerCase()} por WhatsApp`
              : "Nenhuma mensagem enviada"
          }
          detalhe={ultima ? `Enviada ${formatQuando(ultima.enviadaEm)}` : "A cobrança ainda não foi enviada ao inquilino."}
        />
        <Passo
          ok={Boolean(ultima?.entregueEm) || ultima?.status === "lido" || ultima?.status === "entregue"}
          titulo="Entregue no celular"
          detalhe={ultima?.entregueEm ? formatQuando(ultima.entregueEm) : "Ainda sem confirmação de entrega."}
        />
        <Passo
          ok={Boolean(ultima?.lidoEm) || ultima?.status === "lido"}
          titulo="Mensagem lida"
          detalhe={ultima?.lidoEm ? formatQuando(ultima.lidoEm) : "Ainda sem confirmação de leitura."}
        />
        <Passo
          ok={aberturas !== null}
          titulo={aberturas ? `Abriu o link de pagamento${aberturas.total > 1 ? ` (${aberturas.total} vezes)` : ""}` : "Não abriu o link de pagamento"}
          detalhe={
            aberturas
              ? aberturas.total > 1
                ? `Primeira ${formatQuando(aberturas.primeiraEm)} · última ${formatQuando(aberturas.ultimaEm)}`
                : formatQuando(aberturas.primeiraEm)
              : "Nenhuma abertura registrada."
          }
        />
      </ul>

      {mensagens.length > 1 ? (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted hover:text-ink">
            Todas as mensagens ({mensagens.length})
          </summary>
          <ul className="mt-2 divide-y divide-line">
            {mensagens.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span className="text-ink">{TEMPLATE_LABELS[m.template] ?? m.template}</span>
                <span className="text-faint tnum">
                  {formatQuando(m.enviadaEm)} · {STATUS_LABEL[m.status]}
                  {m.lidoEm ? ` ${formatQuando(m.lidoEm)}` : m.entregueEm ? ` ${formatQuando(m.entregueEm)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
