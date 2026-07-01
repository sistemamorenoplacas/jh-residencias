"use client";

import { useState, useTransition } from "react";

import { StatusPill } from "@/components/ui/StatusPill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { formatBRL } from "@/lib/money";
import { formatCompetencia, formatData } from "@/lib/dates";
import type { ChargeStatus } from "@/lib/types";
import type { ValorDevido } from "@/lib/charges";
import { reenviarCobranca, cancelarCobranca, marcarPagoManualmente } from "@/app/(painel)/cobrancas/actions";

/** Dados desnormalizados de uma cobrança para a tela de detalhe. */
export interface ChargeDetailData {
  id: string;
  inquilino: string;
  imovel: string;
  competencia: string; // YYYY-MM-01
  vencimento: string; // YYYY-MM-DD
  status: ChargeStatus;
  pixCopiaCola: string | null;
  linkPagamento: string | null;
  qrCodeBase64: string | null;
  pagoEm: string | null; // ISO timestamp
  valor: ValorDevido;
}

interface ChargeDetailProps {
  charge: ChargeDetailData;
}

function CopyPixButton({ pix }: { pix: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <PrimaryButton variant="ghost" onClick={handleCopiar}>
      {copiado ? "Copiado!" : "Copiar código"}
    </PrimaryButton>
  );
}

/** Linha "rótulo: valor" da composição do valor devido. */
function LinhaValor({
  rotulo,
  centavos,
  destaque = false,
}: {
  rotulo: string;
  centavos: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        destaque ? "border-t border-line pt-2.5" : ""
      }`}
    >
      <span className={destaque ? "font-semibold text-ink" : "text-muted"}>
        {rotulo}
      </span>
      <span
        className={`tnum ${
          destaque ? "text-lg font-semibold text-ink" : "text-ink"
        }`}
      >
        {formatBRL(centavos)}
      </span>
    </div>
  );
}

/**
 * Detalhe de uma cobrança: composição do valor (base + multa + juros quando
 * vencida), QR Pix copia-e-cola, link de pagamento e ações de reenvio/cancelamento.
 */
export function ChargeDetail({ charge }: ChargeDetailProps) {
  const [mensagem, setMensagem] = useState<{
    tipo: "ok" | "erro";
    texto: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const emAberto = charge.status === "pendente" || charge.status === "vencido";
  const temAtraso = charge.valor.diasAtraso > 0;

  function executar(
    acao: () => Promise<{ ok: boolean; error: string | null }>,
    sucesso: string,
  ) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await acao();
      setMensagem(
        resultado.ok
          ? { tipo: "ok", texto: sucesso }
          : {
              tipo: "erro",
              texto: resultado.error ?? "Falha ao processar a ação.",
            },
      );
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Coluna principal: identificação + composição do valor */}
      <div className="flex flex-col gap-5">
        <section className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-ink">
                {charge.inquilino}
              </p>
              <p className="truncate text-sm text-faint">{charge.imovel}</p>
            </div>
            <StatusPill
              status={charge.status}
              diasAtraso={charge.valor.diasAtraso}
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-faint">Competência</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {formatCompetencia(charge.competencia)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Vencimento</dt>
              <dd className="mt-0.5 font-medium text-ink tnum">
                {formatData(charge.vencimento)}
              </dd>
            </div>
            {charge.pagoEm ? (
              <div>
                <dt className="text-xs text-faint">Pago em</dt>
                <dd className="mt-0.5 font-medium text-pago tnum">
                  {formatData(charge.pagoEm.slice(0, 10))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Valor devido</h2>
          <div className="mt-3 flex flex-col gap-2.5 text-sm">
            <LinhaValor rotulo="Aluguel" centavos={charge.valor.baseCentavos} />
            {temAtraso ? (
              <>
                <LinhaValor
                  rotulo="Multa"
                  centavos={charge.valor.multaCentavos}
                />
                <LinhaValor
                  rotulo={`Juros (${charge.valor.diasAtraso}d de atraso)`}
                  centavos={charge.valor.jurosCentavos}
                />
              </>
            ) : null}
            <LinhaValor
              rotulo="Total"
              centavos={charge.valor.totalCentavos}
              destaque
            />
          </div>
        </section>
      </div>

      {/* Coluna lateral: Pix + ações */}
      <div className="flex flex-col gap-5">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Pagamento Pix</h2>

          {charge.pixCopiaCola ? (
            <>
              {charge.qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${charge.qrCodeBase64}`}
                  alt="QR Code Pix"
                  width={180}
                  height={180}
                  className="mx-auto mt-4 rounded-card border border-line"
                />
              ) : null}

              <p className="mt-4 text-xs font-medium text-muted">
                Pix copia-e-cola
              </p>
              <p className="mt-1 break-all rounded-card border border-line bg-canvas p-3 text-xs text-ink">
                {charge.pixCopiaCola}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <CopyPixButton pix={charge.pixCopiaCola} />
                {charge.linkPagamento ? (
                  <a
                    href={charge.linkPagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                  >
                    Abrir link
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-faint">
              Pix ainda não gerado. Reenvie a cobrança para criar o código.
            </p>
          )}
        </section>

        {emAberto ? (
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Ações</h2>
            <div className="mt-3 flex flex-col gap-2">
              <PrimaryButton
                onClick={() =>
                  executar(
                    () => reenviarCobranca(charge.id),
                    "Cobrança reenviada por WhatsApp.",
                  )
                }
                disabled={pending}
              >
                {pending ? "Processando..." : "Reenviar cobrança"}
              </PrimaryButton>
              <PrimaryButton
                variant="ghost"
                onClick={() =>
                  executar(
                    () => marcarPagoManualmente(charge.id),
                    "Cobrança marcada como paga.",
                  )
                }
                disabled={pending}
              >
                Marcar como pago (manual)
              </PrimaryButton>
              <PrimaryButton
                variant="ghost"
                onClick={() =>
                  executar(
                    () => cancelarCobranca(charge.id),
                    "Cobrança cancelada.",
                  )
                }
                disabled={pending}
              >
                Cancelar cobrança
              </PrimaryButton>
            </div>

            {mensagem ? (
              <p
                className={`mt-3 text-xs font-medium ${
                  mensagem.tipo === "ok" ? "text-pago" : "text-vencido"
                }`}
              >
                {mensagem.texto}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
