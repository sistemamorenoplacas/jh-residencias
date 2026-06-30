"use client";

import { useState } from "react";

import { alternarAtivoContrato } from "@/app/(painel)/contratos/actions";
import { formatBRL } from "@/lib/money";
import { formatData } from "@/lib/dates";
import {
  LeaseForm,
  type LeaseFormOption,
  type LeaseFormValues,
} from "@/components/contratos/LeaseForm";

export interface LeaseListItem extends LeaseFormValues {
  imovel: string;
  inquilino: string;
}

interface LeaseListProps {
  leases: readonly LeaseListItem[];
  properties: readonly LeaseFormOption[];
  tenants: readonly LeaseFormOption[];
}

function AtivoBadge({ ativo }: { ativo: boolean }) {
  const styles = ativo ? "bg-pago-tint text-pago" : "bg-line text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ativo ? "Ativo" : "Encerrado"}
    </span>
  );
}

function ToggleAtivoButton({ id, ativo }: { id: string; ativo: boolean }) {
  return (
    <form action={alternarAtivoContrato} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={String(ativo)} />
      <button
        type="submit"
        className="rounded-pill px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas"
      >
        {ativo ? "Encerrar" : "Reativar"}
      </button>
    </form>
  );
}

/** Vencimento legível: "todo dia 5". */
function vencimentoLabel(dia: number): string {
  return `Vence dia ${dia}`;
}

export function LeaseList({ leases, properties, tenants }: LeaseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const editing = leases.find((l) => l.id === editingId) ?? null;

  const toolbar = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        {leases.length} {leases.length === 1 ? "contrato" : "contratos"}
      </p>
      {!isCreating && !editing ? (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Novo contrato
        </button>
      ) : null}
    </div>
  );

  if (leases.length === 0 && !isCreating) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Nenhum contrato cadastrado</p>
          <p className="mt-1 text-sm text-muted">
            Crie o primeiro contrato vinculando um imóvel a um inquilino.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}

      {isCreating ? (
        <LeaseForm
          properties={properties}
          tenants={tenants}
          onClose={() => setIsCreating(false)}
        />
      ) : null}

      {editing ? (
        <LeaseForm
          properties={properties}
          tenants={tenants}
          lease={editing}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      {leases.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Nenhum contrato cadastrado ainda</p>
        </div>
      ) : null}

      {/* Desktop */}
      <div
        className={`overflow-hidden rounded-card border border-line bg-surface ${
          leases.length === 0 ? "hidden" : "hidden md:block"
        }`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-faint">
              <th className="px-5 py-3 font-medium">Imóvel / Inquilino</th>
              <th className="px-5 py-3 text-right font-medium">Aluguel</th>
              <th className="px-5 py-3 font-medium">Vencimento</th>
              <th className="px-5 py-3 font-medium">Vigência</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {leases.map((l) => (
              <tr key={l.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink">{l.imovel}</p>
                  <p className="text-xs text-faint">{l.inquilino}</p>
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-ink tnum">
                  {formatBRL(l.valorCentavos)}
                </td>
                <td className="px-5 py-3.5 text-muted">{vencimentoLabel(l.diaVencimento)}</td>
                <td className="px-5 py-3.5 text-muted tnum">
                  {formatData(l.inicio)}
                  {l.fim ? ` – ${formatData(l.fim)}` : ""}
                </td>
                <td className="px-5 py-3.5">
                  <AtivoBadge ativo={l.ativo} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(l.id)}
                      className="rounded-pill px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-tint"
                    >
                      Editar
                    </button>
                    <ToggleAtivoButton id={l.id} ativo={l.ativo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className={`flex-col gap-3 md:hidden ${leases.length === 0 ? "hidden" : "flex"}`}>
        {leases.map((l) => (
          <li key={l.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{l.imovel}</p>
                <p className="truncate text-xs text-faint">{l.inquilino}</p>
              </div>
              <AtivoBadge ativo={l.ativo} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-faint">{vencimentoLabel(l.diaVencimento)}</p>
                <p className="text-lg font-semibold text-ink tnum">{formatBRL(l.valorCentavos)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(l.id)}
                  className="rounded-pill bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-dark"
                >
                  Editar
                </button>
                <ToggleAtivoButton id={l.id} ativo={l.ativo} />
              </div>
            </div>
            <p className="mt-2 text-xs text-faint tnum">
              {formatData(l.inicio)}
              {l.fim ? ` – ${formatData(l.fim)}` : " — sem término"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
