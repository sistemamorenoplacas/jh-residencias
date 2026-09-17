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
              SEU PATRIMÔNIO, EM PERSPECTIVA
            </span>
            <span className="estate-period">
              <DashboardIcon name="calendar" />
              {subtitle}
            </span>
          </div>
          <h1 id="dashboard-title">
            Um olhar sobre
            <br />
            seus imóveis<span>.</span>
          </h1>
          <p className="estate-hero-description">
            Mais clareza para cuidar do que é seu.
          </p>
          <div className="estate-hero-totals">
            <div>
              <p>Aluguéis recebidos</p>
              <strong>{money(kpis.recebidoCentavos)}</strong>
            </div>
            <div>
              <p>Pendente de recebimento</p>
              <strong>{money(kpis.pendenteCentavos)}</strong>
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
            <span>Competência atual</span>
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
              <h2>Receita do mês</h2>
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
          </section>
          <section className="estate-card estate-stat">
            <div className="estate-section-heading">
              <h2>Pagamentos concluídos</h2>
              <Link
                href="/cobrancas"
                className="estate-icon-button"
                aria-label="Ver pagamentos nas cobranças"
              >
                <DashboardIcon name="arrow" />
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
      <footer className="estate-footer">
        <span>
          JH Residências <i /> Cuidar do seu patrimônio começa por aqui.
        </span>
        <span>Gestão simples. Mais tranquilidade.</span>
      </footer>
    </>
  );
}
