"use client";

import { useState } from "react";

/**
 * Botão de copiar o Pix copia-e-cola numa página pública (sem sessão).
 * Usa a Clipboard API; em falha (navegador antigo / contexto inseguro) faz
 * fallback para seleção manual do texto exibido acima.
 */
export function CopyPixButton({
  codigo,
  label = "Copiar código Pix",
  labelCopiado = "Código copiado ✓",
}: {
  codigo: string;
  label?: string;
  labelCopiado?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState(false);

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setErro(false);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCopiar}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-dark)] px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-brand)] active:scale-[0.99]"
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
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copiado ? labelCopiado : label}
      </button>
      {erro && (
        <p className="mt-2 text-center text-xs text-[var(--color-vencido)]">
          Não foi possível copiar automaticamente. Selecione o código acima e
          copie manualmente.
        </p>
      )}
    </div>
  );
}
