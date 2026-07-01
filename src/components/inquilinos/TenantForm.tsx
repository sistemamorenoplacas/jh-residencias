"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import type { Tenant } from "@/lib/types";
import {
  criarInquilino,
  atualizarInquilino,
  TENANT_FORM_INITIAL_STATE,
  type TenantFormState,
} from "@/app/(painel)/inquilinos/actions";

/**
 * Formata dígitos de telefone BR como `+55 (11) 99999-8888` conforme o
 * usuário digita. Aceita entrada com ou sem o prefixo "+55" e sempre
 * devolve uma máscara visual — o valor enviado ao servidor é normalizado
 * separadamente para E.164 (`normalizePhoneE164`), pois a Server Action
 * exige o formato estrito `/^\+[1-9]\d{6,14}$/` sem parênteses/espaços.
 */
function formatPhoneBR(raw: string): string {
  // Mantém apenas dígitos, descartando um eventual "55" duplicado de DDI
  // colado à frente (o usuário pode digitar com ou sem o "+55").
  let digits = raw.replace(/\D/g, "");

  // Remove o DDI 55 se já vier embutido, para tratar sempre DDD+número.
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  let formatted = "+55";
  if (ddd) formatted += ` (${ddd}`;
  if (ddd.length === 2) formatted += ")";
  if (rest.length > 0) {
    const isCelular = rest.length > 4;
    const prefixLen = isCelular ? rest.length - 4 : rest.length;
    const prefix = rest.slice(0, Math.min(prefixLen, 5));
    const suffix = rest.slice(prefix.length);
    formatted += ` ${prefix}`;
    if (suffix) formatted += `-${suffix}`;
  }

  return formatted;
}

/** Extrai o E.164 (`+5511999998888`) a partir da string mascarada/digitada. */
function normalizePhoneE164(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  return digits.length > 0 ? `+55${digits}` : "";
}

/** Formata dígitos de CPF como `000.000.000-11` conforme o usuário digita. */
function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  let formatted = part1;
  if (part2) formatted += `.${part2}`;
  if (part3) formatted += `.${part3}`;
  if (part4) formatted += `-${part4}`;
  return formatted;
}

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
 * Nome e e-mail permanecem não-controlados (`defaultValue`). Telefone e CPF
 * são controlados para aplicar máscara de digitação em tempo real:
 *  - Telefone exibe `+55 (11) 99999-8888`, mas o valor enviado no `name`
 *    real usado pela Server Action (`telefone`) é o E.164 normalizado
 *    (`+5511999998888`), pois o validador do servidor é estrito
 *    (`/^\+[1-9]\d{6,14}$/`, sem parênteses/espaços). O input visível usa
 *    um `name` próprio e um `<input type="hidden" name="telefone">` carrega
 *    o valor normalizado de fato submetido.
 *  - CPF exibe `000.000.000-00`; a Server Action já normaliza removendo
 *    não-dígitos antes de validar, então o próprio input mascarado pode
 *    usar `name="cpf"` diretamente.
 *
 * A validação forte (E.164, e-mail, CPF) continua acontecendo no servidor;
 * aqui há apenas máscara + dicas de formato para feedback imediato.
 */
export function TenantForm({ tenant, onCancel, onSuccess }: TenantFormProps) {
  const isEdit = Boolean(tenant);
  const action = isEdit ? atualizarInquilino : criarInquilino;

  const [state, formAction] = useActionState<TenantFormState, FormData>(
    action,
    TENANT_FORM_INITIAL_STATE,
  );

  const [telefone, setTelefone] = useState(() => formatPhoneBR(tenant?.telefone ?? ""));
  const [cpf, setCpf] = useState(() => formatCpf(tenant?.cpf ?? ""));

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
          name="telefoneMascarado"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          value={telefone}
          onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
          placeholder="+55 (11) 99999-8888"
          className="field tnum"
        />
        <input type="hidden" name="telefone" value={normalizePhoneE164(telefone)} />
        <p className="mt-1 text-xs text-faint">
          Formato internacional, ex.: +55 (11) 99999-8888.
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
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
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
