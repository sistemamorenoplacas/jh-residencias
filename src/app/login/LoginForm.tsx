"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction] = useActionState(
    signInWithPassword,
    INITIAL_STATE,
  );

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
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="field"
        />
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
