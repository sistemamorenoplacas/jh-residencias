import { describe, expect, test } from "vitest";

import { descreverMarcos, formatMarcos, parseMarcos } from "./cobranca-params";

describe("parseMarcos", () => {
  test("lê lista com vírgulas e espaços, ordena e remove repetidos", () => {
    expect(parseMarcos("5, -3,0 ,1; 5")).toEqual([-3, 0, 1, 5]);
  });

  test("lista vazia vira nenhum lembrete", () => {
    expect(parseMarcos("")).toEqual([]);
    expect(parseMarcos("  ,  ")).toEqual([]);
  });

  test("rejeita valores não inteiros ou fora do intervalo", () => {
    expect(parseMarcos("-3, abc")).toBeNull();
    expect(parseMarcos("1.5")).toBeNull();
    expect(parseMarcos("-31")).toBeNull();
    expect(parseMarcos("61")).toBeNull();
  });
});

describe("formatMarcos / descreverMarcos", () => {
  test("formata para o campo e descreve em português", () => {
    expect(formatMarcos([-3, 0, 1, 5])).toBe("-3, 0, 1, 5");
    expect(descreverMarcos([-3, 0, 1, 5])).toBe(
      "3 dias antes, no dia do vencimento, 1 dia depois, 5 dias depois",
    );
    expect(descreverMarcos([])).toBe("nenhum lembrete");
  });
});
