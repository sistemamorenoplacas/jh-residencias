"use client";

import { useState } from "react";

import type { Tenant } from "@/lib/types";
import { TenantForm } from "./TenantForm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  excluirInquilino,
  TENANT_FORM_INITIAL_STATE,
} from "@/app/(painel)/inquilinos/actions";

interface TenantListProps {
  tenants: Tenant[];
}

type Editing = { mode: "create" } | { mode: "edit"; tenant: Tenant } | null;

const IconPlus = (
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
);

function initials(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-dark">
      {initials(nome)}
    </span>
  );
}

/** Mascara o CPF para exibição: "12345678901" -> "123.***.**9-01". */
function maskCpf(cpf: string | null): string {
  if (!cpf) {
    return "—";
  }
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) {
    return cpf;
  }
  return `${digits.slice(0, 3)}.***.**${digits.slice(8, 9)}-${digits.slice(9)}`;
}

/** Formata E.164 para exibição: +5511999998888 → (11) 99999-8888 */
function displayTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    if (num.length === 8) return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
  return telefone;
}

interface RowActionsProps {
  tenant: Tenant;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function RowActions({ tenant, onEdit, onDelete, deleting }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-pill px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-tint"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Excluir ${tenant.nome}`}
        className="rounded-pill px-3 py-1.5 text-xs font-medium text-vencido hover:bg-vencido-tint disabled:opacity-50"
      >
        {deleting ? "Excluindo…" : "Excluir"}
      </button>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
        <svg
          className="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.5-1.5-4.6-3.7-5.5" />
        </svg>
      </span>
      <div>
        <p className="text-base font-semibold text-ink">
          Nenhum inquilino ainda
        </p>
        <p className="mt-1 text-sm text-muted">
          Cadastre seu primeiro inquilino para gerar cobranças.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="mt-1 inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        {IconPlus}
        Adicionar inquilino
      </button>
    </div>
  );
}

/**
 * Lista interativa de inquilinos.
 *
 * Recebe os dados do Server Component (já mapeados para `Tenant` de domínio) e
 * gerencia o estado de UI: abrir form de criação/edição em um painel modal e
 * acionar exclusão. As mutações são Server Actions; `revalidatePath` no
 * servidor sincroniza a lista após cada operação.
 */
export function TenantList({ tenants }: TenantListProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Tenant | null>(null);
  const [busca, setBusca] = useState("");

  const filtrados = busca.trim()
    ? tenants.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()))
    : tenants;

  function closePanel() {
    setEditing(null);
  }

  async function confirmarDelete(tenant: Tenant) {
    setConfirmTarget(null);
    setDeleteError(null);
    setDeletingId(tenant.id);

    const formData = new FormData();
    formData.set("id", tenant.id);
    const result = await excluirInquilino(TENANT_FORM_INITIAL_STATE, formData);

    setDeletingId(null);
    if (!result.ok) {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Buscar inquilino…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="field max-w-xs"
          aria-label="Buscar inquilino por nome"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-sm text-muted">
            {filtrados.length}{" "}
            {filtrados.length === 1 ? "inquilino" : "inquilinos"}
          </p>
          <button
            type="button"
            onClick={() => setEditing({ mode: "create" })}
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tint"
          >
            {IconPlus}
            <span className="hidden sm:inline">Adicionar inquilino</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>
      </div>

      {deleteError ? (
        <p
          role="alert"
          className="rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido"
        >
          {deleteError}
        </p>
      ) : null}

      {tenants.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ mode: "create" })} />
      ) : filtrados.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-5 py-10 text-center text-sm text-faint">
          Nenhum inquilino encontrado para &ldquo;{busca}&rdquo;.
        </p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-faint">
                  <th className="px-5 py-3 font-medium">Inquilino</th>
                  <th className="px-5 py-3 font-medium">Telefone</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">CPF</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-line/70 last:border-0 hover:bg-canvas/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar nome={t.nome} />
                        <span className="font-medium text-ink">{t.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted tnum">
                      {displayTelefone(t.telefone)}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{t.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-muted tnum">
                      {maskCpf(t.cpf)}
                    </td>
                    <td className="px-5 py-3.5">
                      <RowActions
                        tenant={t}
                        onEdit={() => setEditing({ mode: "edit", tenant: t })}
                        onDelete={() => setConfirmTarget(t)}
                        deleting={deletingId === t.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filtrados.map((t) => (
              <li
                key={t.id}
                className="rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar nome={t.nome} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{t.nome}</p>
                      <p className="truncate text-xs text-faint tnum">
                        {displayTelefone(t.telefone)}
                      </p>
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-faint">E-mail</dt>
                  <dt className="text-faint">CPF</dt>
                  <dd className="truncate text-muted">{t.email ?? "—"}</dd>
                  <dd className="text-muted tnum">{maskCpf(t.cpf)}</dd>
                </dl>
                <div className="mt-3 border-t border-line pt-2">
                  <RowActions
                    tenant={t}
                    onEdit={() => setEditing({ mode: "edit", tenant: t })}
                    onDelete={() => setConfirmTarget(t)}
                    deleting={deletingId === t.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {confirmTarget ? (
        <ConfirmModal
          title="Excluir inquilino"
          message={`Tem certeza que deseja excluir "${confirmTarget.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => confirmarDelete(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}

      {editing ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={
              editing.mode === "edit" ? "Editar inquilino" : "Novo inquilino"
            }
            onClick={closePanel}
          >
            <div
              className="w-full max-w-md rounded-t-shell border border-line bg-surface p-5 shadow-xl sm:rounded-shell sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">
                {editing.mode === "edit"
                  ? "Editar inquilino"
                  : "Novo inquilino"}
              </h2>
              <TenantForm
                tenant={editing.mode === "edit" ? editing.tenant : undefined}
                onCancel={closePanel}
                onSuccess={closePanel}
              />
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
