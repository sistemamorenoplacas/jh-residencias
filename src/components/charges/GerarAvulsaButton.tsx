"use client";

import { useState, useTransition } from "react";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { gerarCobrancaAvulsa } from "@/app/(painel)/cobrancas/actions";
import { competenciaAtual } from "@/lib/charge-generation";

/** Opção de contrato para o seletor da cobrança avulsa. */
export interface LeaseOption {
  id: string;
  inquilino: string;
  imovel: string;
}

interface GerarAvulsaButtonProps {
  leases: readonly LeaseOption[];
}

const IconPlus = (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * Abre um painel inline para gerar uma cobrança avulsa: escolhe o contrato e a
 * competência (default: mês corrente) e chama a server action. Feedback de
 * sucesso/erro inline; sem navegação.
 */
export function GerarAvulsaButton({ leases }: GerarAvulsaButtonProps) {
  const [aberto, setAberto] = useState(false);
  const [leaseId, setLeaseId] = useState<string>(leases[0]?.id ?? "");
  const [competencia, setCompetencia] = useState<string>(() =>
    competenciaAtual(new Date()),
  );
  const [mensagem, setMensagem] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const semContratos = leases.length === 0;

  function handleGerar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await gerarCobrancaAvulsa(leaseId, competencia);
      if (resultado.ok) {
        setMensagem({ tipo: "ok", texto: "Cobrança gerada e enviada." });
      } else {
        setMensagem({
          tipo: "erro",
          texto: resultado.error ?? "Falha ao gerar a cobrança.",
        });
      }
    });
  }

  return (
    <div className="relative">
      <PrimaryButton icon={IconPlus} onClick={() => setAberto((v) => !v)}>
        <span className="hidden sm:inline">Nova cobrança</span>
        <span className="sm:hidden">Nova</span>
      </PrimaryButton>

      {aberto ? (
        <div className="absolute right-0 z-20 mt-2 w-[20rem] rounded-card border border-line bg-surface p-4 shadow-lg">
          <h3 className="text-sm font-semibold text-ink">Cobrança avulsa</h3>
          <p className="mt-0.5 text-xs text-faint">
            Gera o Pix e notifica o inquilino por WhatsApp.
          </p>

          <label className="mt-3 block text-xs font-medium text-muted">
            Contrato
            <select
              className="mt-1 w-full rounded-pill border border-line bg-canvas px-3 py-2 text-sm text-ink"
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              disabled={semContratos || pending}
            >
              {semContratos ? (
                <option value="">Nenhum contrato ativo</option>
              ) : (
                leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.inquilino} — {l.imovel}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="mt-3 block text-xs font-medium text-muted">
            Competência
            <input
              type="text"
              inputMode="numeric"
              placeholder="2026-06-01"
              className="mt-1 w-full rounded-pill border border-line bg-canvas px-3 py-2 text-sm text-ink tnum"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              disabled={pending}
            />
          </label>

          {mensagem ? (
            <p
              className={`mt-3 text-xs font-medium ${
                mensagem.tipo === "ok" ? "text-pago" : "text-vencido"
              }`}
            >
              {mensagem.texto}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <PrimaryButton
              variant="ghost"
              onClick={() => setAberto(false)}
              disabled={pending}
            >
              Fechar
            </PrimaryButton>
            <PrimaryButton
              onClick={handleGerar}
              disabled={semContratos || pending || !leaseId}
            >
              {pending ? "Gerando..." : "Gerar"}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
