"use client";

import { useState } from "react";

import { PropertyForm } from "./PropertyForm";

const IconPlus = (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * Botão (no header) que abre o modal de criação de imóvel. Mantém o estado de
 * abertura no client; o `PropertyForm` cuida do submit via Server Action.
 */
export function NovoImovelButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        {IconPlus}
        <span className="hidden sm:inline">Novo imóvel</span>
        <span className="sm:hidden">Novo</span>
      </button>

      {open ? <PropertyForm mode="criar" onClose={() => setOpen(false)} /> : null}
    </>
  );
}
