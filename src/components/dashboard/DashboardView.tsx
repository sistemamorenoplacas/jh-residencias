import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DbProperty } from "@/lib/db-types";
import type { ChargeRow } from "@/lib/types";
import type { Tendencias6Meses } from "@/lib/dashboard";
import { computeKpis } from "@/lib/mock";
import { formatBRL } from "@/lib/money";
import { DashboardIcon } from "./DashboardIcon";
import { DashboardCharges } from "./DashboardCharges";

export interface DashboardPortfolio {
  properties: Pick<
    DbProperty,
    "id" | "nome" | "endereco" | "tipo" | "foto_url"
  >[];
  leases: { property_id: string; valor_centavos: number }[];
  failed: boolean;
}

interface DashboardViewProps {
  charges: ChargeRow[];
  chargesFailed: boolean;
  tendencias: Tendencias6Meses;
  portfolio: DashboardPortfolio;
  subtitle: string;
  labels: string[];
}

const typeLabels = {
  casa: "Casa",
  apartamento: "Apartamento",
  comercial: "Comercial",
};

/** Linha de tendência (celular): 6 pontos com área e ponto final. */
function Sparkline({ values }: { values: number[] }) {
  const gradId = `${useId()}-fill`;
  const w = 120;
  const h = 44;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - 4 - (v / max) * (h - 10),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg
      className="estate-sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5aa6ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5aa6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 1 ? (
        <>
          <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${gradId})`} />
          <path
            d={line}
            fill="none"
            stroke="#5aa6ff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {last ? <circle cx={last[0]} cy={last[1]} r="3.2" fill="#8ec5ff" vectorEffect="non-scaling-stroke" /> : null}
        </>
      ) : null}
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  return (
    <div className="estate-mini-bars" aria-hidden="true">
      {values.flatMap((value, month) =>
        Array.from({ length: 3 }, (_, i) => (
          <span
            key={`${month}-${i}`}
            style={{
              height: `${Math.max(4, value)}%`,
              opacity: month === values.length - 1 ? 1 : 0.15 + month * 0.1,
            }}
          />
        )),
      )}
    </div>
  );
}

export function DashboardView({
  charges,
  chargesFailed,
  tendencias,
  portfolio,
  subtitle,
  labels,
}: DashboardViewProps) {
  const activeCharges = charges.filter(
    (charge) => charge.status !== "cancelado",
  );
  const kpis = computeKpis(activeCharges);
  const paidCount = activeCharges.filter(
    (charge) => charge.status === "pago",
  ).length;
  const occupied = new Set(portfolio.leases.map((lease) => lease.property_id));
  const occupiedCount = portfolio.properties.filter((property) =>
    occupied.has(property.id),
  ).length;
  const occupancy = portfolio.properties.length
    ? Math.round((occupiedCount / portfolio.properties.length) * 100)
    : 0;
  const money = (value: number) => (chargesFailed ? "—" : formatBRL(value));
  const pendingPct = kpis.aReceberCentavos
    ? (kpis.pendenteCentavos / kpis.aReceberCentavos) * 100
    : 0;

  return (
    <>
      <section className="estate-hero" aria-labelledby="dashboard-title">
        <div className="estate-hero-copy">
          <div className="estate-hero-intro">
            <span className="estate-eyebrow">
              <DashboardIcon name="calendar" className="estate-eyebrow-icon" />
              Seu patrimônio, em perspectiva
            </span>
            <Link
              href="/cobrancas"
              className="estate-period"
              aria-label={`Ver cobranças de ${subtitle}`}
            >
              <DashboardIcon name="calendar" className="estate-period-icon" />
              {subtitle}
              <DashboardIcon name="chevron" className="estate-period-chevron" strokeWidth="2.4" />
            </Link>
          </div>
          <h1 id="dashboard-title">
            Um olhar sobre
            <br />
            <span className="estate-hero-l2">
              seus imóveis<b>.</b>
            </span>
          </h1>
          <p className="estate-hero-description">
            Mais clareza para cuidar do que é seu.
          </p>
          <div className="estate-hero-totals">
            <div>
              <span className="estate-total-icon" aria-hidden="true">
                <DashboardIcon name="coins" />
              </span>
              <div>
                <p>Aluguéis recebidos</p>
                <strong>{money(kpis.recebidoCentavos)}</strong>
              </div>
            </div>
            <div>
              <span className="estate-total-icon" aria-hidden="true">
                <DashboardIcon name="clock" />
              </span>
              <div>
                <p>Pendente de recebimento</p>
                <strong>{money(kpis.pendenteCentavos)}</strong>
              </div>
            </div>
          </div>
          <div
            className="estate-progress"
            role="img"
            aria-label={
              chargesFailed
                ? "Recebimentos indisponíveis"
                : `${kpis.recebidoPct}% recebido, ${Math.round(pendingPct)}% pendente`
            }
          >
            <span style={{ width: `${kpis.recebidoPct}%` }} />
            <span style={{ width: `${pendingPct}%` }} />
          </div>
          <div className="estate-progress-caption">
            <span>
              <i /> Recebido{" "}
              <b>{chargesFailed ? "—" : `${kpis.recebidoPct}%`}</b>
            </span>
            <span>
              <i /> Pendente
            </span>
            <span className="estate-caption-period">
              <DashboardIcon name="chevron" width="12" height="12" strokeWidth="2.4" />
              Competência atual
            </span>
          </div>
        </div>
        <div className="estate-hero-visual" aria-hidden="true">
          <Image
            src="/images/dashboard-galeria.webp"
            alt=""
            fill
            preload
            sizes="(max-width: 700px) 100vw, 55vw"
          />
          <span className="estate-visual-caption">
            ESPAÇOS PARA VIVER. TRANQUILIDADE PARA GERIR.
          </span>
        </div>
      </section>

      <div className="estate-overview">
        <div className="estate-stat-stack">
          <section className="estate-card estate-stat">
            <div className="estate-section-heading">
              <div className="estate-stat-title">
                <span className="estate-stat-icon" aria-hidden="true">
                  <DashboardIcon name="calendar" />
                </span>
                <h2>Receita do mês</h2>
              </div>
              <Link
                href="/cobrancas"
                className="estate-icon-button"
                aria-label="Ver receita nas cobranças"
              >
                <DashboardIcon name="arrow" />
              </Link>
            </div>
            <div className="estate-stat-bottom">
              <div>
                <strong className="estate-number">
                  {money(kpis.aReceberCentavos)}
                </strong>
                <p>
                  {chargesFailed
                    ? "Dados indisponíveis"
                    : `${activeCharges.length} cobranças no mês`}
                </p>
              </div>
              <MiniBars values={tendencias.recebido} />
            </div>
            <Sparkline values={tendencias.recebido} />
          </section>
          <section className="estate-card estate-stat">
            <div className="estate-section-heading">
              <div className="estate-stat-title">
                <span className="estate-stat-icon is-green" aria-hidden="true">
                  <DashboardIcon name="card" />
                </span>
                <h2>Pagamentos concluídos</h2>
              </div>
              <Link
                href="/cobrancas"
                className="estate-icon-button estate-chevron-link"
                aria-label="Ver pagamentos nas cobranças"
              >
                <DashboardIcon name="arrow" className="estate-only-desktop" />
                <DashboardIcon name="chevron" className="estate-only-mobile" strokeWidth="2.4" />
              </Link>
            </div>
            <div className="estate-stat-bottom">
              <div>
                <strong className="estate-number">
                  {chargesFailed ? "—" : String(paidCount).padStart(2, "0")}
                </strong>
                <p>
                  neste mês{" "}
                  <span className="estate-small-badge">
                    <DashboardIcon name="check" className="estate-badge-check" width="10" height="10" strokeWidth="3" />
                    {chargesFailed ? "—" : `${kpis.recebidoPct}% recebido`}
                  </span>
                </p>
              </div>
              <MiniBars values={tendencias.recebido} />
            </div>
          </section>
        </div>

        <section className="estate-card estate-performance">
          <div className="estate-section-heading">
            <h2>Recebimentos</h2>
            <span className="estate-tag">6 meses</span>
          </div>
          <div className="estate-performance-value">
            <strong className="estate-number">
              {chargesFailed ? "—" : `${kpis.recebidoPct}%`}
            </strong>
            <p>do valor previsto neste mês</p>
          </div>
          <div
            className="estate-bar-chart"
            role="img"
            aria-label="Percentual recebido e inadimplência nos últimos seis meses"
          >
            {labels.map((label, index) => (
              <div className="estate-chart-row" key={label}>
                <span>{label}</span>
                <div className="estate-chart-track">
                  <div
                    className="estate-chart-received"
                    style={{ width: `${tendencias.recebido[index]}%` }}
                  />
                  <div
                    className="estate-chart-late"
                    style={{ width: `${tendencias.inadimplencia[index]}%` }}
                  />
                </div>
                <strong>{tendencias.recebido[index]}%</strong>
                <span className="sr-only">
                  {tendencias.inadimplencia[index]}% de inadimplência
                </span>
              </div>
            ))}
            <div className="estate-chart-axis">
              <span>0</span>
              <span>50</span>
              <span>100%</span>
            </div>
          </div>
          <div className="estate-chart-legend">
            <span>
              <i />
              Recebido
            </span>
            <span>
              <i />
              Inadimplência
            </span>
          </div>
        </section>

        <section className="estate-card estate-properties">
          <div className="estate-section-heading">
            <div>
              <p className="estate-eyebrow">SEU PORTFÓLIO</p>
              <h2>Imóveis em destaque</h2>
            </div>
            <Link
              href="/imoveis"
              className="estate-icon-button"
              aria-label="Ver todos os imóveis"
            >
              <DashboardIcon name="arrow" />
            </Link>
          </div>
          {portfolio.failed ? (
            <p className="estate-empty" role="alert">
              Não foi possível carregar os imóveis. Tente recarregar a página.
            </p>
          ) : portfolio.properties.length ? (
            <div className="estate-property-grid">
              {portfolio.properties.slice(0, 3).map((property) => {
                const rent = portfolio.leases
                  .filter((lease) => lease.property_id === property.id)
                  .reduce((sum, lease) => sum + lease.valor_centavos, 0);
                return (
                  <Link
                    href="/imoveis"
                    className="estate-property"
                    key={property.id}
                    aria-label={`Gerenciar ${property.nome}`}
                  >
                    <div className="estate-property-photo">
                      {property.foto_url ? (
                        <Image
                          src={property.foto_url}
                          alt={property.nome}
                          fill
                          unoptimized
                          sizes="(max-width: 700px) 80vw, 20vw"
                        />
                      ) : (
                        <div className="estate-photo-placeholder">
                          <DashboardIcon name="home" width="48" height="48" />
                          <span>Foto não cadastrada</span>
                        </div>
                      )}
                      <span className="estate-property-type">
                        {typeLabels[property.tipo]}
                      </span>
                      <span className="estate-property-arrow">
                        <DashboardIcon name="arrow" />
                      </span>
                    </div>
                    <div className="estate-property-info">
                      <span
                        className={`estate-property-status ${occupied.has(property.id) ? "is-rented" : ""}`}
                      >
                        <i />
                        {occupied.has(property.id)
                          ? "Alugado"
                          : "Sem contrato ativo"}
                      </span>
                      <h3>{property.nome}</h3>
                      <p className="estate-property-address">
                        <DashboardIcon name="pin" width="12" height="12" />
                        {property.endereco}
                      </p>
                      <div className="estate-property-price">
                        {occupied.has(property.id) ? (
                          <>
                            <strong>{formatBRL(rent)}</strong>
                            <span>/ mês</span>
                          </>
                        ) : (
                          <span>
                            Gerenciar imóvel{" "}
                            <DashboardIcon
                              name="arrow"
                              width="14"
                              height="14"
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="estate-portfolio-empty">
              <span>
                <DashboardIcon name="home" width="40" height="40" />
              </span>
              <h3>Seu próximo capítulo começa aqui.</h3>
              <p>
                Adicione seus imóveis e acompanhe cada detalhe em um só lugar.
              </p>
              <Link href="/imoveis" className="estate-dark-button">
                <DashboardIcon name="plus" /> Cadastrar imóvel
              </Link>
            </div>
          )}
          <div className="estate-properties-footer">
            <span>
              {portfolio.failed
                ? "Portfólio indisponível"
                : `${portfolio.properties.length} imóveis no seu portfólio`}
            </span>
            <Link href="/imoveis">
              Explorar imóveis{" "}
              <DashboardIcon name="arrow" width="15" height="15" />
            </Link>
          </div>
        </section>
      </div>

      <div className="estate-bottom-grid">
        <DashboardCharges rows={charges} failed={chargesFailed} />
        <section className="estate-card estate-occupancy">
          <div className="estate-section-heading">
            <h2>Ocupação dos imóveis</h2>
            <Link
              href="/contratos"
              className="estate-icon-button"
              aria-label="Ver contratos"
            >
              <DashboardIcon name="arrow" />
            </Link>
          </div>
          <div
            className="estate-occupancy-ring"
            style={{
              background: `conic-gradient(var(--color-brand) ${occupancy}%, var(--color-brand-tint) 0)`,
            }}
          >
            <div>
              <strong>{portfolio.failed ? "—" : `${occupancy}%`}</strong>
              <span>de ocupação</span>
            </div>
          </div>
          <div className="estate-occupancy-details">
            <div>
              <span>
                <i />
                Alugados
              </span>
              <strong>{portfolio.failed ? "—" : occupiedCount}</strong>
            </div>
            <div>
              <span>
                <i />
                Sem contrato ativo
              </span>
              <strong>
                {portfolio.failed
                  ? "—"
                  : portfolio.properties.length - occupiedCount}
              </strong>
            </div>
          </div>
          <Link href="/contratos" className="estate-occupancy-link">
            Gerenciar contratos{" "}
            <DashboardIcon name="arrow" width="16" height="16" />
          </Link>
        </section>
      </div>
    </>
  );
}
