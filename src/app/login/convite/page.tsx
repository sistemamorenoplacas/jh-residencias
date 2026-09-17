import type { Metadata } from "next";
import Link from "next/link";

import { isTipoConvite } from "@/lib/convite";
import { ativarConvite } from "./actions";

export const metadata: Metadata = { title: "Convite — JH Residências" };

/**
 * Página pública de ativação do convite de administrador. Só mostra o botão:
 * a troca do token por sessão acontece na Server Action (POST), não no GET.
 */
export default async function ConvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const tipo = typeof params.type === "string" ? params.type : "";
  const invalido = params.erro === "1" || !tokenHash || !isTipoConvite(tipo);

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="JH Residências" className="h-20 w-auto" />
          <p className="mt-0.5 text-sm text-muted">Convite de administrador</p>
        </div>

        <div className="card-surface p-6">
          {invalido ? (
            <div className="flex flex-col gap-3 text-center">
              <p className="font-semibold text-ink">Este link não é válido ou já expirou.</p>
              <p className="text-sm text-muted">
                Peça um novo link a quem convidou você. Se já criou sua senha, é só entrar.
              </p>
              <Link href="/login" className="mt-1 text-sm font-medium text-brand hover:text-brand-dark">
                Ir para o login
              </Link>
            </div>
          ) : (
            <form action={ativarConvite} className="flex flex-col gap-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={tipo} />
              <div className="text-center">
                <p className="font-semibold text-ink">Você foi convidado(a) para administrar o sistema.</p>
                <p className="mt-1 text-sm text-muted">
                  Toque no botão para ativar seu acesso. Em seguida, você cria a sua senha.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-pill bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Ativar meu acesso
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
