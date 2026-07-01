"use client";

import { useActionState } from "react";
import { atualizarNome, atualizarSenha, type PerfilState } from "./actions";

const INIT: PerfilState = { error: null, success: null };

function Alert({ state }: { state: PerfilState }) {
  if (state.success)
    return (
      <p className="rounded-lg bg-pago-tint px-3 py-2 text-sm font-medium text-pago">
        {state.success}
      </p>
    );
  if (state.error)
    return (
      <p className="rounded-lg bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido">
        {state.error}
      </p>
    );
  return null;
}

export function NomeForm({ nomeAtual }: { nomeAtual: string }) {
  const [state, action, pending] = useActionState(atualizarNome, INIT);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Alert state={state} />
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="nome">
          Nome de exibição
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          defaultValue={nomeAtual}
          required
          className="field"
          placeholder="Seu nome"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Salvando…" : "Salvar nome"}
        </button>
      </div>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState(atualizarSenha, INIT);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Alert state={state} />
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="senha">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={6}
          className="field"
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor="confirmacao">
          Confirmar senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          className="field"
          placeholder="Repita a senha"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Salvando…" : "Atualizar senha"}
        </button>
      </div>
    </form>
  );
}
