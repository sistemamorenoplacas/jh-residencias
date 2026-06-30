import { describe, it, expect } from "vitest";

import {
  competenciaAtual,
  planejarCobrancasDoMes,
} from "@/lib/charge-generation";
import type { DbLease } from "@/lib/db-types";

/**
 * Testes do planejamento PURO de cobranças do mês.
 * Determinístico, sem I/O; vencimento = competência com dia_vencimento clamp 1..28.
 */

function leaseFake(overrides: Partial<DbLease>): DbLease {
  return {
    id: "lease-1",
    owner_id: "owner-1",
    property_id: "prop-1",
    tenant_id: "tenant-1",
    valor_centavos: 150_000,
    dia_vencimento: 10,
    inicio: "2026-01-01",
    fim: null,
    multa_percent: 2,
    juros_mes_percent: 1,
    ativo: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("competenciaAtual", () => {
  it("retorna o 1º dia do mês corrente em UTC (YYYY-MM-01)", () => {
    // Arrange
    const hoje = new Date("2026-07-23T15:30:00Z");

    // Act
    const competencia = competenciaAtual(hoje);

    // Assert
    expect(competencia).toBe("2026-07-01");
  });

  it("padroniza o mês com zero à esquerda (Janeiro)", () => {
    // Arrange
    const hoje = new Date("2026-01-05T00:00:00Z");

    // Act
    const competencia = competenciaAtual(hoje);

    // Assert
    expect(competencia).toBe("2026-01-01");
  });

  it("usa UTC: virada de mês não vaza para o fuso local", () => {
    // Arrange: 1 de agosto às 00:00 UTC
    const hoje = new Date("2026-08-01T00:00:00Z");

    // Act
    const competencia = competenciaAtual(hoje);

    // Assert
    expect(competencia).toBe("2026-08-01");
  });
});

describe("planejarCobrancasDoMes", () => {
  it("deriva o vencimento aplicando o dia_vencimento do contrato", () => {
    // Arrange
    const leases = [leaseFake({ id: "lease-a", dia_vencimento: 10 })];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-07-01");

    // Assert
    expect(planos).toEqual([
      {
        leaseId: "lease-a",
        competencia: "2026-07-01",
        valorCentavos: 150_000,
        vencimento: "2026-07-10",
      },
    ]);
  });

  it("trava dia_vencimento acima de 28 em 28 (meses curtos)", () => {
    // Arrange
    const leases = [leaseFake({ id: "lease-b", dia_vencimento: 31 })];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-02-01");

    // Assert
    expect(planos[0].vencimento).toBe("2026-02-28");
  });

  it("trava dia_vencimento abaixo de 1 em 1", () => {
    // Arrange
    const leases = [leaseFake({ id: "lease-c", dia_vencimento: 0 })];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-07-01");

    // Assert
    expect(planos[0].vencimento).toBe("2026-07-01");
  });

  it("padroniza o dia do vencimento com zero à esquerda", () => {
    // Arrange
    const leases = [leaseFake({ id: "lease-d", dia_vencimento: 5 })];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-07-01");

    // Assert
    expect(planos[0].vencimento).toBe("2026-07-05");
  });

  it("planeja uma cobrança para cada lease, preservando ordem e valores", () => {
    // Arrange
    const leases = [
      leaseFake({ id: "lease-1", valor_centavos: 100_000, dia_vencimento: 5 }),
      leaseFake({ id: "lease-2", valor_centavos: 250_000, dia_vencimento: 15 }),
      leaseFake({ id: "lease-3", valor_centavos: 80_000, dia_vencimento: 28 }),
    ];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-07-01");

    // Assert
    expect(planos).toHaveLength(3);
    expect(planos.map((p) => p.leaseId)).toEqual([
      "lease-1",
      "lease-2",
      "lease-3",
    ]);
    expect(planos.map((p) => p.valorCentavos)).toEqual([
      100_000, 250_000, 80_000,
    ]);
    expect(planos.map((p) => p.vencimento)).toEqual([
      "2026-07-05",
      "2026-07-15",
      "2026-07-28",
    ]);
  });

  it("retorna lista vazia quando não há leases ativos", () => {
    // Arrange
    const leases: DbLease[] = [];

    // Act
    const planos = planejarCobrancasDoMes(leases, "2026-07-01");

    // Assert
    expect(planos).toEqual([]);
  });
});
