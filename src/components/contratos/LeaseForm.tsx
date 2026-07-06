"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  criarContrato,
  atualizarContrato,
} from "@/app/(painel)/contratos/actions";
import {
  INITIAL_LEASE_STATE,
  type LeaseFormState,
} from "@/app/(painel)/contratos/form-state";
import { formatAmount } from "@/lib/money";

export interface LeaseFormOption {
  id: string;
  label: string;
}

export interface LeaseFormValues {
  id: string;
  propertyId: string;
  tenantId: string;
  valorCentavos: number;
  diaVencimento: number;
  multaPercent: number;
  jurosMesPercent: number;
  inicio: string;
  fim: string | null;
  ativo: boolean;
}

interface LeaseFormProps {
  properties: readonly LeaseFormOption[];
  tenants: readonly LeaseFormOption[];
  /** Quando presente, o form edita o contrato; ausente, cria um novo. */
  lease?: LeaseFormValues;
  /** Fecha o formulário (cancelar ou após sucesso). */
  onClose: () => void;
}

const DEFAULT_MULTA_PERCENT = 2.0;
const DEFAULT_JUROS_MES_PERCENT = 1.0;
const DEFAULT_DIA_VENCIMENTO = 5;

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar contrato"}
    </button>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium text-muted"
    >
      {children}
    </label>
  );
}

export function LeaseForm({
  properties,
  tenants,
  lease,
  onClose,
}: LeaseFormProps) {
  const isEdit = Boolean(lease);
  const action = isEdit ? atualizarContrato : criarContrato;

  const [state, formAction] = useActionState<LeaseFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.error === null) {
        onClose();
      }
      return result;
    },
    INITIAL_LEASE_STATE,
  );

  const valorInicial = lease ? formatAmount(lease.valorCentavos) : "";
  const hasOptions = properties.length > 0 && tenants.length > 0;

  return (
    <form
      action={formAction}
      className="rounded-card border border-line bg-surface p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {isEdit ? "Editar contrato" : "Novo contrato"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill px-2.5 py-1 text-xs font-medium text-muted hover:bg-canvas"
        >
          Cancelar
        </button>
      </div>

      {lease ? <input type="hidden" name="id" value={lease.id} /> : null}

      {!hasOptions ? (
        <p className="mb-4 rounded-card bg-pendente-tint px-3 py-2.5 text-xs text-pendente">
          Cadastre ao menos um imóvel e um inquilino antes de criar um contrato.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="propertyId">Imóvel</FieldLabel>
          <select
            id="propertyId"
            name="propertyId"
            required
            defaultValue={lease?.propertyId ?? ""}
            className="field"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="tenantId">Inquilino</FieldLabel>
          <select
            id="tenantId"
            name="tenantId"
            required
            defaultValue={lease?.tenantId ?? ""}
            className="field"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="valor">Valor do aluguel (R$)</FieldLabel>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            required
            placeholder="1.500,00"
            defaultValue={valorInicial}
            className="field tnum"
          />
        </div>

        <div>
          <FieldLabel htmlFor="diaVencimento">
            Dia do vencimento (1–28)
          </FieldLabel>
          <input
            id="diaVencimento"
            name="diaVencimento"
            type="number"
            min={1}
            max={28}
            required
            defaultValue={lease?.diaVencimento ?? DEFAULT_DIA_VENCIMENTO}
            className="field tnum"
          />
        </div>

        <div>
          <FieldLabel htmlFor="multaPercent">Multa por atraso (%)</FieldLabel>
          <input
            id="multaPercent"
            name="multaPercent"
            type="number"
            step="0.1"
            min={0}
            required
            defaultValue={lease?.multaPercent ?? DEFAULT_MULTA_PERCENT}
            className="field tnum"
          />
        </div>

        <div>
          <FieldLabel htmlFor="jurosMesPercent">Juros ao mês (%)</FieldLabel>
          <input
            id="jurosMesPercent"
            name="jurosMesPercent"
            type="number"
            step="0.1"
            min={0}
            required
            defaultValue={lease?.jurosMesPercent ?? DEFAULT_JUROS_MES_PERCENT}
            className="field tnum"
          />
        </div>

        <div>
          <FieldLabel htmlFor="inicio">Início</FieldLabel>
          <input
            id="inicio"
            name="inicio"
            type="date"
            required
            defaultValue={lease?.inicio ?? ""}
            className="field tnum"
          />
        </div>

        <div>
          <FieldLabel htmlFor="fim">Término (opcional)</FieldLabel>
          <input
            id="fim"
            name="fim"
            type="date"
            defaultValue={lease?.fim ?? ""}
            className="field tnum"
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={lease?.ativo ?? true}
          className="size-4 rounded border-line accent-brand"
        />
        Contrato ativo
      </label>

      {state.error ? (
        <p
          className="mt-4 rounded-card bg-vencido-tint px-3 py-2.5 text-sm text-vencido"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas"
        >
          Cancelar
        </button>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
