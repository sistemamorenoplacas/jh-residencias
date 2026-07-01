"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { atualizarSenhaRecuperacao, type NovaSenhaState } from "@/app/login/actions";

const INITIAL: NovaSenhaState = { ok: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex w-full items-center justify-center rounded-pill bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Salvando…" : "Redefinir senha"}
    </button>
  );
}

const IconEye = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export default function NovaSenhaPage() {
  const [state, formAction] = useActionState(atualizarSenhaRecuperacao, INITIAL);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="JH Residências" className="h-20 w-auto" />
          <p className="mt-0.5 text-sm text-muted">Redefinir senha</p>
        </div>

        <div className="card-surface p-6 shadow-[0_1px_2px_rgba(20,32,25,0.04),0_8px_24px_-12px_rgba(20,32,25,0.12)]">
          {state.ok ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint">
                <svg className="size-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-ink">Senha redefinida com sucesso!</p>
                <p className="mt-1 text-sm text-muted">
                  Já pode entrar com a nova senha.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4" noValidate>
              <div>
                <p className="mb-4 text-sm text-muted">
                  Escolha uma nova senha para sua conta.
                </p>
                <label htmlFor="senha" className="label">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    name="senha"
                    type={showSenha ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
                  >
                    {showSenha ? IconEyeOff : IconEye}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmar" className="label">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    id="confirmar"
                    name="confirmar"
                    type={showConfirmar ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar((v) => !v)}
                    aria-label={showConfirmar ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
                  >
                    {showConfirmar ? IconEyeOff : IconEye}
                  </button>
                </div>
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
