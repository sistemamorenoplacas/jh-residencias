import { describe, it, expect } from "vitest";

import { formatCompetencia, formatDiaMes, formatData } from "@/lib/dates";

/**
 * Testes dos helpers de data. Entrada ISO (YYYY-MM-DD); saída pt-BR.
 * Funções puras de string — não dependem de Date/timezone.
 */

describe("formatCompetencia", () => {
  it("converte competência ISO em Mês/Ano por extenso", () => {
    // Arrange / Act / Assert
    expect(formatCompetencia("2026-07-01")).toBe("Julho/2026");
  });

  it("mapeia o primeiro mês (Janeiro)", () => {
    expect(formatCompetencia("2026-01-01")).toBe("Janeiro/2026");
  });

  it("mapeia o último mês (Dezembro)", () => {
    expect(formatCompetencia("2026-12-01")).toBe("Dezembro/2026");
  });

  it("usa acentuação correta (Março)", () => {
    expect(formatCompetencia("2026-03-01")).toBe("Março/2026");
  });
});

describe("formatDiaMes", () => {
  it("converte ISO em DD/MM", () => {
    expect(formatDiaMes("2026-07-10")).toBe("10/07");
  });

  it("preserva os zeros à esquerda de dia e mês", () => {
    expect(formatDiaMes("2026-01-05")).toBe("05/01");
  });
});

describe("formatData", () => {
  it("converte ISO em DD/MM/AAAA", () => {
    expect(formatData("2026-07-10")).toBe("10/07/2026");
  });

  it("preserva zeros à esquerda", () => {
    expect(formatData("2026-02-03")).toBe("03/02/2026");
  });
});
