"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { signInWithPassword, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null };

interface LoginFormProps {
  redirectTo: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tint disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Entrando…" : "Entrar"}
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

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction] = useActionState(signInWithPassword, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
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

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">
            Senha
          </label>
          <Link
            href="/login/recuperar"
            tabIndex={-1}
            className="text-xs font-medium text-brand hover:text-brand-dark"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="field pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
          >
            {showPassword ? IconEyeOff : IconEye}
          </button>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
