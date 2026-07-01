import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/logo.svg" alt="JH Residências" className="h-16 w-auto opacity-80" />
        <div>
          <p className="text-6xl font-bold text-brand">404</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">Página não encontrada</h1>
          <p className="mt-1 text-sm text-muted">
            O endereço que você acessou não existe ou foi removido.
          </p>
        </div>
        <Link
          href="/painel"
          className="mt-2 rounded-pill bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
