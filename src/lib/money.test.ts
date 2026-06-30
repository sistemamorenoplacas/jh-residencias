import { describe, it, expect } from "vitest";

import { formatBRL, formatAmount, parseBRLToCentavos } from "@/lib/money";

/**
 * Testes de formatação/parse monetário. Centavos (inteiro) na borda interna;
 * string formatada só na exibição. NBSP do Intl pt-BR é normalizado com \s.
 */

describe("formatBRL", () => {
  it("formata centavos em moeda BRL com símbolo", () => {
    // Arrange / Act
    const texto = formatBRL(153_000);

    // Assert: Intl pt-BR usa espaço (possivelmente NBSP) após o símbolo
    expect(texto).toMatch(/^R\$\s?1\.530,00$/);
  });

  it("formata zero centavos", () => {
    // Arrange / Act
    const texto = formatBRL(0);

    // Assert
    expect(texto).toMatch(/^R\$\s?0,00$/);
  });

  it("mantém duas casas decimais para valores quebrados", () => {
    // Arrange / Act
    const texto = formatBRL(99);

    // Assert
    expect(texto).toMatch(/^R\$\s?0,99$/);
  });
});

describe("formatAmount", () => {
  it("formata sem o símbolo de moeda", () => {
    // Arrange / Act
    const texto = formatAmount(153_000);

    // Assert
    expect(texto).toBe("1.530,00");
  });

  it("não deixa resíduo do símbolo R$ nem espaço inicial", () => {
    // Arrange / Act
    const texto = formatAmount(123_456);

    // Assert
    expect(texto).toBe("1.234,56");
    expect(texto.startsWith("R$")).toBe(false);
  });
});

describe("parseBRLToCentavos", () => {
  it("converte formato pt-BR completo (milhar + decimal)", () => {
    // Arrange / Act / Assert
    expect(parseBRLToCentavos("1.530,00")).toBe(153_000);
  });

  it("converte sem separador de milhar (vírgula decimal)", () => {
    expect(parseBRLToCentavos("1530,00")).toBe(153_000);
  });

  it("converte formato com ponto decimal (estilo en-US)", () => {
    expect(parseBRLToCentavos("1530.00")).toBe(153_000);
  });

  it("ignora o símbolo de moeda e espaços", () => {
    expect(parseBRLToCentavos("R$ 1.234,56")).toBe(123_456);
  });

  it("trata múltiplos separadores de milhar", () => {
    expect(parseBRLToCentavos("1.234.567,89")).toBe(123_456_789);
  });

  it("converte valor menor que um real", () => {
    expect(parseBRLToCentavos("0,99")).toBe(99);
  });

  it("converte inteiro sem casas decimais", () => {
    expect(parseBRLToCentavos("100")).toBe(10_000);
  });

  it("lança erro para entrada com múltiplos sinais/separadores inválidos", () => {
    // Arrange / Act / Assert
    expect(() => parseBRLToCentavos("12-34")).toThrow(/inválido/);
  });

  it("lança erro para entrada com vírgulas duplicadas", () => {
    expect(() => parseBRLToCentavos("1,2,3")).toThrow(/inválido/);
  });

  it("lança erro para sinais de menos repetidos", () => {
    expect(() => parseBRLToCentavos("--5")).toThrow(/inválido/);
  });
});
