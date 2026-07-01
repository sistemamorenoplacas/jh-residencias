import Link from "next/link";

import type { ChargeRow } from "@/lib/types";
import { formatAmount } from "@/lib/money";
import { formatDiaMes } from "@/lib/dates";
import { StatusPill } from "@/components/ui/StatusPill";

function initials(nome: string): string {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint font-serif text-sm font-semibold text-brand-dark ring-1 ring-inset ring-brand/10">
      {initials(nome)}
    </span>
  );
}

function DetalhesLink({ id }: { id: string }) {
  return (
    <Link
      href={`/cobrancas/${id}`}
      className="font-mono text-[11px] uppercase tracking-wider text-brand transition-colors hover:text-brand-dark"
    >
      Abrir →
    </Link>
  );
}

interface ChargesTableProps {
  rows: ChargeRow[];
}

/** Tabela para desktop. Em telas pequenas vira lista de cards. */
export function ChargesTable({ rows }: ChargesTableProps) {
  return (
    <>
      {/* Desktop */}
      <div className="card-surface hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th className="px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
                Inquilino
              </th>
              <th className="px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
                Vencimento
              </th>
              <th className="px-5 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
                Valor
              </th>
              <th className="px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
                Status
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 transition-colors hover:bg-canvas">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar nome={r.inquilino} />
                    <div className="min-w-0">
                      <Link href={`/cobrancas/${r.id}`} className="block truncate font-medium text-ink transition-colors hover:text-brand hover:underline">{r.inquilino}</Link>
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
                  <DetalhesLink id={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="card-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={r.inquilino} />
                <div className="min-w-0">
                  <Link href={`/cobrancas/${r.id}`} className="block truncate font-medium text-ink transition-colors hover:text-brand hover:underline">{r.inquilino}</Link>
                  <p className="truncate text-xs text-faint">{r.imovel}</p>
                </div>
              </div>
              <StatusPill status={r.status} diasAtraso={r.diasAtraso} />
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  Vence {formatDiaMes(r.vencimento)}
                </p>
                <p className="serif text-xl text-ink">R$ {formatAmount(r.valorCentavos)}</p>
              </div>
              <DetalhesLink id={r.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
