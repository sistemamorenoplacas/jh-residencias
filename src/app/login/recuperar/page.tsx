"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resetPassword, type RecuperarState } from "@/app/login/actions";

const INITIAL: RecuperarState = { ok: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex w-full items-center justify-center rounded-pill bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Enviando…" : "Enviar link de recuperação"}
    </button>
  );
}

export default function RecuperarSenhaPage() {
  const [state, formAction] = useActionState(resetPassword, INITIAL);

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="JH Residências" className="h-20 w-auto" />
          <p className="mt-0.5 text-sm text-muted">Recuperação de senha</p>
        </div>

        <div className="card-surface p-6">
          {state.ok ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint">
                <svg className="size-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-ink">Link enviado!</p>
                <p className="mt-1 text-sm text-muted">
                  Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4" noValidate>
              <div>
                <p className="mb-4 text-sm text-muted">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
                <label htmlFor="email" className="label">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@exemplo.com"
                  className="field"
                />
              </div>

              {state.error ? (
                <p role="alert" className="rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido">
                  {state.error}
                </p>
              ) : null}

              <SubmitButton />

              <Link
                href="/login"
                className="text-center text-sm font-medium text-muted hover:text-ink"
              >
                ← Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
