import { describe, it, expect } from "vitest";

import { diasAtraso, valorDevido } from "@/lib/charges";

/**
 * Testes da regra central de valor da cobrança (camada PURA).
 * Valores em centavos (inteiro); arredondamento half-up; juros pró-rata die.
 */

const BASE = 100_000; // R$ 1.000,00

describe("diasAtraso", () => {
  it("retorna 0 no próprio dia do vencimento (ignora hora)", () => {
    // Arrange
    const vencimento = "2026-06-10";
    const hoje = new Date("2026-06-10T23:59:59Z");

    // Act
    const dias = diasAtraso(vencimento, hoje);

    // Assert
    expect(dias).toBe(0);
  });

  it("retorna 1 no primeiro dia após o vencimento", () => {
    // Arrange
    const vencimento = "2026-06-10";
    const hoje = new Date("2026-06-11T00:00:00Z");

    // Act
    const dias = diasAtraso(vencimento, hoje);

    // Assert
    expect(dias).toBe(1);
  });

  it("retorna 0 quando a data atual é anterior ao vencimento", () => {
    // Arrange
    const vencimento = "2026-06-10";
    const hoje = new Date("2026-06-05T12:00:00Z");

    // Act
    const dias = diasAtraso(vencimento, hoje);

    // Assert
    expect(dias).toBe(0);
  });

  it("conta dias inteiros independentemente da hora do dia (timezone UTC)", () => {
    // Arrange
    const vencimento = "2026-06-10";
    const hoje = new Date("2026-06-15T18:30:00Z");

    // Act
    const dias = diasAtraso(vencimento, hoje);

    // Assert
    expect(dias).toBe(5);
  });
});

describe("valorDevido", () => {
  it("sem atraso: total = base, multa e juros zerados", () => {
    // Arrange
    const params = {
      baseCentavos: BASE,
      vencimento: "2026-06-10",
      multaPercent: 2,
      jurosMesPercent: 1,
    };
    const hoje = new Date("2026-06-10T08:00:00Z");

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert
    expect(resultado).toEqual({
      baseCentavos: BASE,
      multaCentavos: 0,
      jurosCentavos: 0,
      totalCentavos: BASE,
      diasAtraso: 0,
    });
  });

  it("com atraso de 1 mês completo: multa fixa + juros de 30 dias", () => {
    // Arrange
    const params = {
      baseCentavos: BASE,
      vencimento: "2026-06-10",
      multaPercent: 2,
      jurosMesPercent: 1,
    };
    const hoje = new Date("2026-07-10T00:00:00Z"); // 30 dias

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert
    expect(resultado.diasAtraso).toBe(30);
    expect(resultado.multaCentavos).toBe(2_000); // 2% de 100000
    expect(resultado.jurosCentavos).toBe(1_000); // 1% * 30/30
    expect(resultado.totalCentavos).toBe(BASE + 2_000 + 1_000);
  });

  it("juros pró-rata die: 15 dias = metade do juro mensal", () => {
    // Arrange
    const params = {
      baseCentavos: BASE,
      vencimento: "2026-06-10",
      multaPercent: 2,
      jurosMesPercent: 1,
    };
    const hoje = new Date("2026-06-25T00:00:00Z"); // 15 dias

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert
    expect(resultado.diasAtraso).toBe(15);
    expect(resultado.jurosCentavos).toBe(500); // 1% * 15/30 de 100000
    expect(resultado.multaCentavos).toBe(2_000);
    expect(resultado.totalCentavos).toBe(BASE + 2_000 + 500);
  });

  it("multa arredonda half-up (250.5 -> 251)", () => {
    // Arrange: 2% de 12525 = 250.5 centavos
    const params = {
      baseCentavos: 12_525,
      vencimento: "2026-06-10",
      multaPercent: 2,
      jurosMesPercent: 0,
    };
    const hoje = new Date("2026-06-11T00:00:00Z"); // 1 dia para entrar no ramo de atraso

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert
    expect(resultado.multaCentavos).toBe(251);
  });

  it("juros arredonda half-up (22.5 -> 23)", () => {
    // Arrange: 1% de 4500 * 15/30 = 22.5 centavos
    const params = {
      baseCentavos: 4_500,
      vencimento: "2026-06-10",
      multaPercent: 0,
      jurosMesPercent: 1,
    };
    const hoje = new Date("2026-06-25T00:00:00Z"); // 15 dias

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert
    expect(resultado.jurosCentavos).toBe(23);
  });

  it("preserva baseCentavos no resultado mesmo com atraso", () => {
    // Arrange
    const params = {
      baseCentavos: BASE,
      vencimento: "2026-06-10",
      multaPercent: 2,
      jurosMesPercent: 1,
    };
    const hoje = new Date("2026-06-17T00:00:00Z"); // 7 dias

    // Act
    const resultado = valorDevido(params, hoje);

    // Assert: juros = round(100000 * 0.01 * 7 / 30) = round(233.33) = 233
    expect(resultado.baseCentavos).toBe(BASE);
    expect(resultado.jurosCentavos).toBe(233);
    expect(resultado.totalCentavos).toBe(
      resultado.baseCentavos + resultado.multaCentavos + resultado.jurosCentavos,
    );
  });
});
