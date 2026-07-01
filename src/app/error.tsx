"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/logo.svg" alt="JH Residências" className="h-16 w-auto opacity-80" />
        <div>
          <p className="text-5xl font-bold text-vencido">!</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">Algo deu errado</h1>
          <p className="mt-1 text-sm text-muted">
            Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-faint">Código: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-pill bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Tentar novamente
          </button>
          <a
            href="/painel"
            className="rounded-pill border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
          >
            Ir ao painel
          </a>
        </div>
      </div>
    </main>
  );
}
