"use client";

import { useActionState, useEffect, useState } from "react";

import {
  salvarConfiguracoes,
  CONFIG_FORM_INITIAL_STATE,
} from "@/app/(painel)/configuracoes/actions";
import type { AppSettings } from "@/lib/settings";

interface ConfigFormProps {
  settings: AppSettings;
}

/** Interruptor estilizado (checkbox acessível) para uma opção booleana. */
function Toggle({
  name,
  defaultChecked,
  titulo,
  descricao,
}: {
  name: string;
  defaultChecked: boolean;
  titulo: string;
  descricao: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{titulo}</span>
        <span className="block text-xs text-muted">{descricao}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-brand" : "bg-line-strong"
        }`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

export function ConfigForm({ settings }: ConfigFormProps) {
  const [state, formAction, pending] = useActionState(
    salvarConfiguracoes,
    CONFIG_FORM_INITIAL_STATE,
  );

  // Some o "Salvo!" depois de alguns segundos.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (state.saved) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state.saved]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Automação */}
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Cobrança automática
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            O sistema cobra seus inquilinos sozinho, todo dia 1º.
          </p>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4">
          <Toggle
            name="cobrancaAutomatica"
            defaultChecked={settings.cobrancaAutomatica}
            titulo="Gerar e enviar cobranças automaticamente"
            descricao="Todo dia 1º, cria as cobranças do mês dos contratos ativos e envia o Pix por WhatsApp."
          />
          <div className="h-px bg-line" />
          <Toggle
            name="lembretesAtivos"
            defaultChecked={settings.lembretesAtivos}
            titulo="Enviar lembretes automáticos"
            descricao="Lembra o inquilino 3 dias antes, no vencimento e após o atraso."
          />
        </div>
      </section>

      {/* Contato de suporte */}
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Contato de suporte
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Aparece para o inquilino nas páginas de pagamento (Pix e boleto).
          </p>
        </header>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <label htmlFor="suporteWhatsapp" className="label">
              WhatsApp
            </label>
            <input
              id="suporteWhatsapp"
              name="suporteWhatsapp"
              type="text"
              defaultValue={settings.suporteWhatsapp}
              placeholder="(31) 99999-9999"
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="suporteEmail" className="label">
              E-mail
            </label>
            <input
              id="suporteEmail"
              name="suporteEmail"
              type="email"
              defaultValue={settings.suporteEmail}
              placeholder="financeiro@exemplo.com.br"
              className="field mt-1"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-pill bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>
        {showSaved && (
          <span className="text-sm font-medium text-pago" role="status">
            Salvo!
          </span>
        )}
        {state.error && (
          <span className="text-sm text-vencido" role="alert">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
