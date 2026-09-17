"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChargeRow } from "@/lib/types";
import { formatBRL } from "@/lib/money";
import { formatDiaMes } from "@/lib/dates";
import { StatusPill } from "@/components/ui/StatusPill";
import { DashboardIcon } from "./DashboardIcon";

export function DashboardCharges({
  rows,
  failed = false,
}: {
  rows: ChargeRow[];
  failed?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (status === "todos" || row.status === status) &&
      normalize(`${row.inquilino} ${row.imovel}`).includes(
        normalize(search.trim()),
      ),
  );

  return (
    <section
      className="estate-card estate-charges"
      aria-labelledby="charges-title"
    >
      <div className="estate-section-heading">
        <div>
          <p className="estate-eyebrow">ACOMPANHAMENTO</p>
          <h2 id="charges-title">Cobranças do mês</h2>
        </div>
        <Link href="/cobrancas" className="estate-text-link">
          Ver todas <DashboardIcon name="arrow" />
        </Link>
      </div>
      <div className="estate-filters">
        <label className="estate-select">
          <DashboardIcon name="settings" />
          <select
            aria-label="Filtrar cobranças por status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="pago">Pagas</option>
            <option value="pendente">Pendentes</option>
            <option value="vencido">Vencidas</option>
            <option value="cancelado">Canceladas</option>
          </select>
        </label>
        <label className="estate-search">
          <DashboardIcon name="search" />
          <input
            id="dashboard-search"
            type="search"
            placeholder="Buscar imóvel ou inquilino"
            aria-label="Buscar imóvel ou inquilino"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {failed ? (
        <p className="estate-empty" role="alert">
          Não foi possível carregar as cobranças. Recarregue a página para
          tentar novamente.
        </p>
      ) : filtered.length ? (
        <div className="estate-table-scroll">
          <table className="estate-table">
            <thead>
              <tr>
                <th scope="col">Imóvel / inquilino</th>
                <th scope="col">Vencimento</th>
                <th scope="col">Valor</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 5).map((row) => (
                <tr key={row.id}>
                  <td className="estate-td-imovel">
                    <Link
                      href={`/cobrancas/${row.id}`}
                      className="estate-charge-property"
                    >
                      <span className="estate-charge-icon">
                        <DashboardIcon name="home" />
                      </span>
                      <span>
                        <strong>{row.imovel}</strong>
                        <small>{row.inquilino}</small>
                      </span>
                    </Link>
                  </td>
                  <td className="tnum estate-td-venc">{formatDiaMes(row.vencimento)}</td>
                  <td className="tnum estate-charge-value estate-td-valor">
                    {formatBRL(row.valorCentavos)}
                  </td>
                  <td className="estate-td-status">
                    <StatusPill
                      status={row.status}
                      diasAtraso={row.diasAtraso}
                    />
                  </td>
                  <td className="estate-td-acao">
                    <Link
                      className="estate-icon-button"
                      href={`/cobrancas/${row.id}`}
                      aria-label={`Abrir cobrança de ${row.inquilino}`}
                    >
                      <DashboardIcon name="arrow" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="estate-empty">
          <DashboardIcon name="search" />
          <p>
            {rows.length
              ? "Nenhuma cobrança encontrada."
              : "Tudo pronto para começar."}
          </p>
          <span>
            {rows.length
              ? "Experimente outro nome ou status."
              : "As cobranças deste mês aparecerão aqui assim que forem geradas."}
          </span>
          {!rows.length && (
            <Link href="/cobrancas" className="estate-text-link">
              Ir para cobranças <DashboardIcon name="arrow" />
            </Link>
          )}
        </div>
      )}
      {!failed && (
        <p className="estate-table-footer" aria-live="polite">
          {filtered.length
            ? `Exibindo ${Math.min(filtered.length, 5)} de ${filtered.length} cobranças`
            : "0 cobranças"}
        </p>
      )}
    </section>
  );
}
