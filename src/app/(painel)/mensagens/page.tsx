import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import type { DbWhatsappMessage, WhatsappStatusDb } from "@/lib/db-types";
import { formatData } from "@/lib/dates";

export const metadata: Metadata = { title: "Mensagens — JH Residências" };

/**
 * Página de histórico de mensagens WhatsApp (Server Component).
 *
 * Busca as últimas mensagens via client SSR (RESPEITA RLS:
 * `owner_id = auth.uid()`), com join em `tenants` para exibir o nome do
 * inquilino. Mapeia o shape cru `DbWhatsappMessage` (snake_case) para o tipo
 * de exibição `MensagemRow` (camelCase) na borda, antes de entregar à UI.
 */

const LIMITE_MENSAGENS = 100;

const TEMPLATE_LABELS: Record<string, string> = {
  cobranca_aluguel: "Cobrança",
  lembrete_vencimento: "Lembrete",
};

/** Shape do join whatsapp_messages -> tenants. */
interface WhatsappMessageJoinRow
  extends Omit<DbWhatsappMessage, "tenant_id"> {
  tenants: { nome: string } | null;
}

interface MensagemRow {
  id: string;
  inquilino: string;
  template: string;
  status: WhatsappStatusDb;
  erro: string | null;
  dataHora: string;
}

/** Traduz o valor cru de `template` para um rótulo amigável em pt-BR. */
function templateLabel(template: string): string {
  return TEMPLATE_LABELS[template] ?? template;
}

/** Formata um timestamp ISO para "dd/mm/aaaa às HH:mm" em pt-BR. */
function formatDataHora(iso: string): string {
  const data = new Date(iso);
  const dataFormatada = formatData(iso.slice(0, 10));
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
  return `${dataFormatada} às ${hora}`;
}

/** `WhatsappMessageJoinRow` -> `MensagemRow` (camelCase, pronto p/ a UI). */
function toMensagemRow(row: WhatsappMessageJoinRow): MensagemRow {
  return {
    id: row.id,
    inquilino: row.tenants?.nome ?? "—",
    template: templateLabel(row.template),
    status: row.status,
    erro: row.erro,
    dataHora: formatDataHora(row.created_at),
  };
}

const STATUS_BADGE: Record<WhatsappStatusDb, { label: string; className: string }> = {
  enviado: { label: "Enviado", className: "bg-pago-tint text-pago" },
  entregue: { label: "Entregue", className: "bg-pago-tint text-pago" },
  lido: { label: "Lido", className: "bg-pago-tint text-pago" },
  falhou: { label: "Falhou", className: "bg-vencido-tint text-vencido" },
};

function StatusBadge({ status }: { status: WhatsappStatusDb }) {
  const badge = STATUS_BADGE[status] ?? {
    label: status,
    className: "bg-pendente-tint text-pendente",
  };
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

export default async function MensagensPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select(
      "id, owner_id, charge_id, tenant_id, template, wamid, status, erro, created_at, tenants(nome)",
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_MENSAGENS);

  const mensagens: MensagemRow[] = error
    ? []
    : ((data ?? []) as unknown as WhatsappMessageJoinRow[]).map(
        toMensagemRow,
      );

  return (
    <AppShell
      title="Mensagens"
      subtitle="Histórico de envios por WhatsApp"
    >
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido"
        >
          Não foi possível carregar as mensagens. Tente recarregar a página.
        </p>
      ) : null}

      {!error && mensagens.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhuma mensagem enviada ainda
          </p>
          <p className="mt-1 text-sm text-faint">
            Os envios de cobrança e lembrete por WhatsApp aparecerão aqui.
          </p>
        </div>
      ) : null}

      {mensagens.length > 0 ? (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-faint">
                  <th className="px-5 py-3 font-medium">Data/hora</th>
                  <th className="px-5 py-3 font-medium">Inquilino</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mensagens.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-line/70 last:border-0 hover:bg-canvas/60"
                  >
                    <td className="px-5 py-3.5 text-muted tnum">
                      {m.dataHora}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {m.inquilino}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{m.template}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={m.status} />
                      {m.status === "falhou" && m.erro ? (
                        <p className="mt-1 text-xs text-faint">{m.erro}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {mensagens.map((m) => (
              <li
                key={m.id}
                className="rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {m.inquilino}
                    </p>
                    <p className="truncate text-xs text-faint tnum">
                      {m.dataHora}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-faint">Tipo</dt>
                  <dd className="truncate text-muted">{m.template}</dd>
                </dl>
                {m.status === "falhou" && m.erro ? (
                  <p className="mt-2 text-xs text-faint">{m.erro}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </AppShell>
  );
}
