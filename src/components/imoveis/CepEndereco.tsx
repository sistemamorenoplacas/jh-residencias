"use client";

import { useEffect, useRef, useState } from "react";

import { formatCep, isCepCompleto, montarEndereco, somenteDigitosCep, type EnderecoCep } from "@/lib/cep";

interface CepEnderecoProps {
  enderecoId: string;
  /** Endereço já salvo (modo editar). */
  enderecoInicial?: string;
}

type Busca =
  | { estado: "parado" }
  | { estado: "buscando" }
  | { estado: "ok"; endereco: EnderecoCep }
  | { estado: "erro"; mensagem: string };

/**
 * CEP + número → preenche o campo Endereço (que continua editável e é o que
 * vai no form como `endereco`). A consulta passa por /api/cep (servidor).
 */
export function CepEndereco({ enderecoId, enderecoInicial = "" }: CepEnderecoProps) {
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [busca, setBusca] = useState<Busca>({ estado: "parado" });
  const ultimoCep = useRef<string>("");
  const numeroRef = useRef<HTMLInputElement>(null);

  // Consulta quando o CEP fica completo (uma vez por CEP).
  useEffect(() => {
    const digitos = somenteDigitosCep(cep);
    if (!isCepCompleto(digitos) || digitos === ultimoCep.current) return;
    ultimoCep.current = digitos;
    const ctrl = new AbortController();
    setBusca({ estado: "buscando" });
    fetch(`/api/cep/${digitos}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "CEP não encontrado." : "Não foi possível consultar o CEP.");
        return (await res.json()) as EnderecoCep;
      })
      .then((achado) => {
        setBusca({ estado: "ok", endereco: achado });
        setEndereco(montarEndereco(achado, numero, complemento));
        numeroRef.current?.focus();
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setBusca({ estado: "erro", mensagem: err instanceof Error ? err.message : "Falha na consulta." });
      });
    return () => ctrl.abort();
    // número/complemento entram só no recompor abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  // Recompõe o endereço quando número/complemento mudam após um CEP achado.
  function atualizarNumero(v: string) {
    setNumero(v);
    if (busca.estado === "ok") setEndereco(montarEndereco(busca.endereco, v, complemento));
  }
  function atualizarComplemento(v: string) {
    setComplemento(v);
    if (busca.estado === "ok") setEndereco(montarEndereco(busca.endereco, numero, v));
  }

  const statusTexto =
    busca.estado === "buscando"
      ? "Buscando endereço…"
      : busca.estado === "ok"
        ? `${busca.endereco.logradouro || "Logradouro não informado"} · ${busca.endereco.bairro ? `${busca.endereco.bairro}, ` : ""}${busca.endereco.cidade} - ${busca.endereco.uf}`
        : busca.estado === "erro"
          ? busca.mensagem
          : "Digite o CEP para preencher o endereço automaticamente.";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor={`${enderecoId}-cep`} className="label">
            CEP
          </label>
          <input
            id={`${enderecoId}-cep`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            placeholder="00000-000"
            maxLength={9}
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${enderecoId}-numero`} className="label">
            Número
          </label>
          <input
            ref={numeroRef}
            id={`${enderecoId}-numero`}
            type="text"
            inputMode="numeric"
            value={numero}
            onChange={(e) => atualizarNumero(e.target.value)}
            placeholder="152"
            maxLength={10}
            className="field"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`${enderecoId}-complemento`} className="label">
            Complemento
          </label>
          <input
            id={`${enderecoId}-complemento`}
            type="text"
            value={complemento}
            onChange={(e) => atualizarComplemento(e.target.value)}
            placeholder="Opcional: Loja 3"
            maxLength={40}
            className="field"
          />
        </div>
      </div>
      <p
        className={`-mt-2 text-xs ${busca.estado === "erro" ? "text-vencido" : busca.estado === "ok" ? "text-pago" : "text-faint"}`}
        aria-live="polite"
      >
        {statusTexto}
      </p>

      <div>
        <label htmlFor={enderecoId} className="label">
          Endereço
        </label>
        <input
          id={enderecoId}
          name="endereco"
          type="text"
          required
          maxLength={200}
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Rua, número, bairro, cidade - UF"
          className="field"
        />
      </div>
    </div>
  );
}
