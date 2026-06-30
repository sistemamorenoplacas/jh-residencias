"use client";

import { useActionState, useEffect, useId } from "react";
import { useFormStatus } from "react-dom";

import type { Tenant } from "@/lib/types";
import {
  criarInquilino,
  atualizarInquilino,
  TENANT_FORM_INITIAL_STATE,
  type TenantFormState,
} from "@/app/(painel)/inquilinos/actions";

interface TenantFormProps {
  /** Quando presente, o form opera em modo edição. */
  tenant?: Tenant;
  /** Fechar o painel/dialog (cancelar). */
  onCancel: () => void;
  /** Chamado após uma submissão bem-sucedida. */
  onSuccess: () => void;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  const idle = isEdit ? "Salvar alterações" : "Adicionar inquilino";
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tint disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Salvando…" : idle}
    </button>
  );
}

/**
 * Formulário de criação/edição de inquilino.
 *
 * Inputs não-controlados + Server Action via `useActionState`. A validação
 * forte (E.164, e-mail, CPF) acontece no servidor; aqui há apenas dicas de
 * formato e `required` no nome/telefone para feedback imediato.
 */
export function TenantForm({ tenant, onCancel, onSuccess }: TenantFormProps) {
  const isEdit = Boolean(tenant);
  const action = isEdit ? atualizarInquilino : criarInquilino;

  const [state, formAction] = useActionState<TenantFormState, FormData>(
    action,
    TENANT_FORM_INITIAL_STATE,
  );

  const nomeId = useId();
  const telefoneId = useId();
  const emailId = useId();
  const cpfId = useId();

  useEffect(() => {
    if (state.ok) {
      onSuccess();
    }
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {tenant ? <input type="hidden" name="id" value={tenant.id} /> : null}

      <div>
        <label htmlFor={nomeId} className="label">
          Nome
        </label>
        <input
          id={nomeId}
          name="nome"
          type="text"
          required
          autoComplete="name"
          defaultValue={tenant?.nome ?? ""}
          placeholder="Maria da Silva"
          className="field"
        />
      </div>

      <div>
        <label htmlFor={telefoneId} className="label">
          Telefone (WhatsApp)
        </label>
        <input
          id={telefoneId}
          name="telefone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={tenant?.telefone ?? ""}
          placeholder="+5511999998888"
          className="field tnum"
        />
        <p className="mt-1 text-xs text-faint">
          Formato internacional E.164, ex.: +5511999998888.
        </p>
      </div>

      <div>
        <label htmlFor={emailId} className="label">
          E-mail <span className="font-normal text-faint">(opcional)</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={tenant?.email ?? ""}
          placeholder="maria@exemplo.com"
          className="field"
        />
      </div>

      <div>
        <label htmlFor={cpfId} className="label">
          CPF <span className="font-normal text-faint">(opcional)</span>
        </label>
        <input
          id={cpfId}
          name="cpf"
          type="text"
          inputMode="numeric"
          defaultValue={tenant?.cpf ?? ""}
          placeholder="000.000.000-00"
          className="field tnum"
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

      <div className="mt-1 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
