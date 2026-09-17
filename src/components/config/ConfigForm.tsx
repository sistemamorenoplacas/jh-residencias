"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  aplicarTaxasAosContratos,
  salvarConfiguracoes,
  CONFIG_FORM_INITIAL_STATE,
  type AplicarTaxasState,
} from "@/app/(painel)/configuracoes/actions";
import { descreverMarcos, formatMarcos, parseMarcos } from "@/lib/cobranca-params";
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

  // Some o "Salvo!" depois de alguns segundos. Guarda qual resultado já foi
  // dispensado (cada envio gera um `state` novo), sem setState síncrono no efeito.
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  useEffect(() => {
    if (!state.saved) return;
    const t = setTimeout(() => setDismissed(state), 3000);
    return () => clearTimeout(t);
  }, [state]);
  const showSaved = state.saved && dismissed !== state;

  // Prévia dos marcos digitados ("3 dias antes, no dia…").
  const [marcosTexto, setMarcosTexto] = useState(formatMarcos(settings.lembreteMarcos));
  const marcosParsed = parseMarcos(marcosTexto);

  // "Aplicar a todos os contratos" é uma ação à parte (não faz parte do submit).
  const [aplicar, setAplicar] = useState<AplicarTaxasState | null>(null);
  const [aplicando, startAplicar] = useTransition();
  function aplicarTaxas() {
    if (!window.confirm("Copiar a multa e os juros salvos para TODOS os contratos ativos?")) return;
    startAplicar(async () => setAplicar(await aplicarTaxasAosContratos()));
  }

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
            descricao={`Lembra o inquilino: ${descreverMarcos(settings.lembreteMarcos)}.`}
          />
        </div>
      </section>

      {/* Atrasos e lembretes */}
      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Atrasos e lembretes
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Multa e juros entram no valor devido após o vencimento. Contratos novos nascem
            com estas taxas; cada contrato pode ter as suas.
          </p>
        </header>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <div>
            <label htmlFor="multaPercent" className="label">
              Multa por atraso (%)
            </label>
            <input
              id="multaPercent"
              name="multaPercent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={20}
              defaultValue={settings.multaPercent}
              className="field mt-1"
            />
            <p className="mt-1 text-xs text-faint">Fixa, sobre o valor do aluguel.</p>
          </div>
          <div>
            <label htmlFor="jurosMesPercent" className="label">
              Juros ao mês (%)
            </label>
            <input
              id="jurosMesPercent"
              name="jurosMesPercent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              max={20}
              defaultValue={settings.jurosMesPercent}
              className="field mt-1"
            />
            <p className="mt-1 text-xs text-faint">Pró-rata por dia de atraso.</p>
          </div>
          <div>
            <label htmlFor="carenciaDias" className="label">
              Carência (dias)
            </label>
            <input
              id="carenciaDias"
              name="carenciaDias"
              type="number"
              inputMode="numeric"
              step="1"
              min={0}
              max={30}
              defaultValue={settings.carenciaDias}
              className="field mt-1"
            />
            <p className="mt-1 text-xs text-faint">Dias após o vencimento sem multa/juros.</p>
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="lembreteMarcos" className="label">
              Lembretes (dias em relação ao vencimento)
            </label>
            <input
              id="lembreteMarcos"
              name="lembreteMarcos"
              type="text"
              inputMode="text"
              value={marcosTexto}
              onChange={(e) => setMarcosTexto(e.target.value)}
              placeholder="-3, 0, 1, 5"
              className="field mt-1"
            />
            <p className={`mt-1 text-xs ${marcosParsed ? "text-faint" : "text-vencido"}`}>
              {marcosParsed
                ? `Negativo = antes do vencimento. Hoje: ${descreverMarcos(marcosParsed)}.`
                : "Use dias inteiros entre -30 e 60, separados por vírgula."}
            </p>
          </div>
          <div className="sm:col-span-3 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={aplicarTaxas}
              disabled={aplicando}
              className="btn-ghost"
            >
              {aplicando ? "Aplicando…" : "Aplicar multa e juros a todos os contratos ativos"}
            </button>
            {aplicar ? (
              <p className={`text-sm ${aplicar.ok ? "text-pago" : "text-vencido"}`} role="status">
                {aplicar.ok
                  ? `${aplicar.atualizados} contrato${aplicar.atualizados === 1 ? "" : "s"} atualizado${aplicar.atualizados === 1 ? "" : "s"}.`
                  : aplicar.error}
              </p>
            ) : (
              <p className="text-xs text-faint">Usa as taxas já salvas. Salve antes, se mudou os valores.</p>
            )}
          </div>
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
