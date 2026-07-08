"use client";

import { useState } from "react";

import type { DbProperty, PropertyTipoDb } from "@/lib/db-types";
import { excluirImovel } from "@/app/(painel)/imoveis/actions";
import { PropertyForm } from "./PropertyForm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface PropertyListProps {
  properties: ReadonlyArray<DbProperty>;
}

const TIPO_LABEL: Record<PropertyTipoDb, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  comercial: "Comercial",
};

const IconPencil = (
  <svg
    className="size-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const IconTrash = (
  <svg
    className="size-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const IconHome = (
  <svg
    className="size-6 text-faint"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

/** Miniatura da foto do imóvel (ou ícone quando não há foto). */
function PropertyThumb({ property }: { property: DbProperty }) {
  if (property.foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={property.foto_url}
        alt={property.nome}
        className="size-12 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-canvas">
      {IconHome}
    </span>
  );
}

export function PropertyList({ properties }: PropertyListProps) {
  const [editing, setEditing] = useState<DbProperty | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<DbProperty | null>(null);
  const [busca, setBusca] = useState("");

  const filtrados = busca.trim()
    ? properties.filter((p) =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.endereco.toLowerCase().includes(busca.toLowerCase()),
      )
    : properties;

  if (properties.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-canvas">
          {IconHome}
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">Nenhum imóvel cadastrado</p>
          <p className="mt-1 text-sm text-muted">
            Cadastre seu primeiro imóvel para começar a gerenciar contratos e cobranças.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar imóvel…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="field max-w-xs"
          aria-label="Buscar imóvel por nome ou endereço"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-5 py-10 text-center text-sm text-faint">
          Nenhum imóvel encontrado para &ldquo;{busca}&rdquo;.
        </p>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="table-base hidden sm:table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Endereço</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((property) => (
                <tr key={property.id}>
                  <td className="font-medium text-ink">
                    <button
                      type="button"
                      onClick={() => setEditing(property)}
                      className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
                      aria-label={`Editar ${property.nome}`}
                    >
                      <PropertyThumb property={property} />
                      <span>{property.nome}</span>
                    </button>
                  </td>
                  <td className="text-muted">{property.endereco}</td>
                  <td>
                    <span className="badge bg-canvas text-muted">{TIPO_LABEL[property.tipo]}</span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="btn-ghost px-2.5 py-1.5"
                        onClick={() => setEditing(property)}
                        aria-label={`Editar ${property.nome}`}
                      >
                        {IconPencil}
                        <span className="hidden md:inline">Editar</span>
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-2.5 py-1.5 text-vencido hover:border-vencido/40"
                        onClick={() => setConfirmTarget(property)}
                        aria-label={`Excluir ${property.nome}`}
                      >
                        {IconTrash}
                        <span className="hidden md:inline">Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line sm:hidden">
            {filtrados.map((property) => (
              <li key={property.id} className="flex items-start justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setEditing(property)}
                  className="flex min-w-0 items-start gap-3 text-left"
                  aria-label={`Editar ${property.nome}`}
                >
                  <PropertyThumb property={property} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{property.nome}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">{property.endereco}</p>
                    <span className="badge mt-2 bg-canvas text-muted">{TIPO_LABEL[property.tipo]}</span>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1.5"
                    onClick={() => setEditing(property)}
                    aria-label={`Editar ${property.nome}`}
                  >
                    {IconPencil}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1.5 text-vencido hover:border-vencido/40"
                    onClick={() => setConfirmTarget(property)}
                    aria-label={`Excluir ${property.nome}`}
                  >
                    {IconTrash}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmTarget ? (
        <ConfirmModal
          title="Excluir imóvel"
          message={`Excluir "${confirmTarget.nome}" também remove os contratos e cobranças vinculados a ele. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          confirmPhrase="excluir imovel"
          onConfirm={async () => {
            const id = confirmTarget.id;
            setConfirmTarget(null);
            const formData = new FormData();
            formData.set("id", id);
            await excluirImovel(formData);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}

      {editing ? (
        <PropertyForm
          mode="editar"
          property={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
