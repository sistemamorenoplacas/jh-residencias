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
        className="w-full rounded-xl bg-[var(--color-brand-dark)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-brand)] active:scale-[0.99]"
      >
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
