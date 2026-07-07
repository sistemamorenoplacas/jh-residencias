"use client";

import { useState, useTransition } from "react";

import { gerarCobrancasDoMes } from "@/app/(painel)/cobrancas/actions";

/**
 * Dispara manualmente a geração das cobranças do mês (mesma rotina do cron
 * mensal). Confirma antes, pois cria cobranças e envia WhatsApp aos inquilinos.
 * É idempotente: contratos que já têm cobrança no mês são pulados.
 */
export function GerarCobrancasButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    const confirmar = window.confirm(
      "Gerar agora as cobranças do mês para todos os contratos ativos e enviar por WhatsApp? Contratos que já têm cobrança neste mês são ignorados.",
    );
    if (!confirmar) return;

    setMessage(null);
    startTransition(async () => {
      const resultado = await gerarCobrancasDoMes();
      setMessage(resultado.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-pill bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Gerando…" : "Gerar cobranças do mês agora"}
      </button>
      {message && (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
