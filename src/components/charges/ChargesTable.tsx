import type { ChargeRow } from "@/lib/types";
import { formatAmount } from "@/lib/money";
import { formatDiaMes } from "@/lib/dates";
import { StatusPill } from "@/components/ui/StatusPill";

function initials(nome: string): string {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-dark">
      {initials(nome)}
    </span>
  );
}

interface ChargesTableProps {
  rows: ChargeRow[];
}

/** Tabela para desktop. Em telas pequenas vira lista de cards (ChargeCard). */
export function ChargesTable({ rows }: ChargesTableProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-faint">
              <th className="px-5 py-3 font-medium">Inquilino</th>
              <th className="px-5 py-3 font-medium">Vencimento</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar nome={r.inquilino} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{r.inquilino}</p>
                      <p className="truncate text-xs text-faint">{r.imovel}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted tnum">{formatDiaMes(r.vencimento)}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-semibold text-ink tnum">R$ {formatAmount(r.valorCentavos)}</span>
                  {r.diasAtraso > 0 ? (
                    <span className="ml-1 text-xs text-vencido">+{r.diasAtraso}d juros</span>
                  ) : null}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill status={r.status} diasAtraso={r.diasAtraso} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button className="rounded-pill px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-tint">
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={r.inquilino} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.inquilino}</p>
                  <p className="truncate text-xs text-faint">{r.imovel}</p>
                </div>
              </div>
              <StatusPill status={r.status} diasAtraso={r.diasAtraso} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-faint">Vence {formatDiaMes(r.vencimento)}</p>
                <p className="text-lg font-semibold text-ink tnum">R$ {formatAmount(r.valorCentavos)}</p>
              </div>
              <button className="rounded-pill bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-dark">
                Detalhes
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
