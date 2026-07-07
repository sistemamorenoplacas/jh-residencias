"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { DbProperty, PropertyTipoDb } from "@/lib/db-types";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  criarImovel,
  editarImovel,
  type PropertyFormState,
} from "@/app/(painel)/imoveis/actions";

type Mode = "criar" | "editar";

interface PropertyFormProps {
  mode: Mode;
  property?: DbProperty;
  onClose: () => void;
}

interface TipoOption {
  value: PropertyTipoDb;
  label: string;
}

const TIPO_OPTIONS: ReadonlyArray<TipoOption> = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
];

const INITIAL_STATE: PropertyFormState = { error: null };

export function PropertyForm({ mode, property, onClose }: PropertyFormProps) {
  const action = mode === "criar" ? criarImovel : editarImovel;
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  const titleId = useId();
  const nomeId = useId();
  const enderecoId = useId();
  const tipoId = useId();
  const fotoId = useId();

  // Fecha o modal quando a action conclui sem erro. `state` é uma nova
  // referência a cada submit; checamos a ausência de erro pós-pending.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && state.error === null) {
      onClose();
    }
  }, [state, onClose]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={onClose}
      >
        <div
          className="card-surface w-full max-w-md p-5 sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              {mode === "criar" ? "Novo imóvel" : "Editar imóvel"}
            </h2>
            <button
              type="button"
              className="btn-ghost size-8 rounded-full p-0"
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            <PendingTracker pendingRef={wasPending} />

            {mode === "editar" && property ? (
              <input type="hidden" name="id" value={property.id} />
            ) : null}

            <div>
              <label htmlFor={nomeId} className="label">
                Nome
              </label>
              <input
                id={nomeId}
                name="nome"
                type="text"
                required
                maxLength={120}
                defaultValue={property?.nome ?? ""}
                placeholder="Ex.: Apto 302 — Ed. Aurora"
                className="field"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor={enderecoId} className="label">
                Endereço
              </label>
              <input
                id={enderecoId}
                name="endereco"
                type="text"
                required
                maxLength={200}
                defaultValue={property?.endereco ?? ""}
                placeholder="Rua, número, bairro, cidade"
                className="field"
              />
            </div>

            <div>
              <label htmlFor={tipoId} className="label">
                Tipo
              </label>
              <select
                id={tipoId}
                name="tipo"
                required
                defaultValue={property?.tipo ?? "apartamento"}
                className="field"
              >
                {TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={fotoId} className="label">
                Foto do imóvel <span className="text-faint">(opcional)</span>
              </label>
              {property?.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.foto_url}
                  alt={property.nome}
                  className="mb-2 h-32 w-full rounded-xl object-cover"
                />
              ) : null}
              <input
                id={fotoId}
                name="foto"
                type="file"
                accept="image/*"
                className="field"
              />
              {mode === "editar" ? (
                <p className="mt-1 text-xs text-faint">
                  Deixe em branco para manter a foto atual.
                </p>
              ) : null}
            </div>

            {state.error ? (
              <p className="text-sm font-medium text-vencido" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="mt-1 flex items-center justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <SubmitButton mode={mode} />
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * Mantém `pendingRef` verdadeiro a partir do momento em que um submit começa,
 * para que o efeito de fechamento no pai só dispare após uma submissão real
 * (e não no mount inicial).
 */
function PendingTracker({
  pendingRef,
}: {
  pendingRef: React.MutableRefObject<boolean>;
}) {
  const { pending } = useFormStatus();
  useEffect(() => {
    if (pending) {
      pendingRef.current = true;
    }
  }, [pending, pendingRef]);
  return null;
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const label = mode === "criar" ? "Cadastrar" : "Salvar";
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}
