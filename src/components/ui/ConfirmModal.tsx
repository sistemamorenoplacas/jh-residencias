"use client";

import { useState } from "react";

import { ModalPortal } from "@/components/ui/ModalPortal";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  /**
   * Se definido, exige que o usuário digite exatamente esta frase (sem
   * diferenciar maiúsculas/minúsculas) para liberar o botão de confirmação.
   * Proteção contra exclusões acidentais de ações irreversíveis.
   */
  confirmPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmação estilizado — substitui `window.confirm` nativo.
 * Com `confirmPhrase`, vira uma confirmação "digite para confirmar".
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Excluir",
  confirmPhrase,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState("");

  const requiresPhrase = Boolean(confirmPhrase);
  const podeConfirmar =
    !requiresPhrase ||
    typed.trim().toLowerCase() === confirmPhrase!.trim().toLowerCase();

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={onCancel}
      >
        <div
          className="w-full max-w-sm rounded-shell border border-line bg-surface p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="confirm-title" className="text-base font-semibold text-ink">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted">{message}</p>

          {requiresPhrase && (
            <div className="mt-4">
              <label htmlFor="confirm-phrase" className="label">
                Para confirmar, digite{" "}
                <span className="font-semibold text-ink">{confirmPhrase}</span>
              </label>
              <input
                id="confirm-phrase"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && podeConfirmar) onConfirm();
                }}
                placeholder={confirmPhrase}
                autoFocus
                autoComplete="off"
                className="field mt-1"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-pill border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!podeConfirmar}
              className="rounded-pill bg-vencido px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
