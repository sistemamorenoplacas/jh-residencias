import { describe, expect, test } from "vitest";

import { formatCep, isCepCompleto, mapearRespostaCep, montarEndereco } from "./cep";

describe("formatCep", () => {
  test("aplica a máscara conforme digita", () => {
    expect(formatCep("0100")).toBe("0100");
    expect(formatCep("010010")).toBe("01001-0");
    expect(formatCep("01001000")).toBe("01001-000");
    expect(formatCep("01001-0009")).toBe("01001-000");
  });

  test("isCepCompleto exige 8 dígitos", () => {
    expect(isCepCompleto("01001-000")).toBe(true);
    expect(isCepCompleto("01001")).toBe(false);
  });
});

describe("montarEndereco", () => {
  const base = { logradouro: "Rua Inajá", bairro: "Tabajara", cidade: "Olinda", uf: "PE" };

  test("monta com número", () => {
    expect(montarEndereco(base, "152")).toBe("Rua Inajá, 152, Tabajara, Olinda - PE");
  });

  test("inclui complemento e omite partes vazias", () => {
    expect(montarEndereco(base, "152", "Loja 3")).toBe("Rua Inajá, 152, Loja 3, Tabajara, Olinda - PE");
    expect(montarEndereco({ ...base, logradouro: "", bairro: "" }, "")).toBe("Olinda - PE");
  });
});

describe("mapearRespostaCep", () => {
  test("lê o formato do ViaCEP", () => {
    expect(
      mapearRespostaCep({ logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" }),
    ).toEqual({ logradouro: "Praça da Sé", bairro: "Sé", cidade: "São Paulo", uf: "SP" });
  });

  test("lê o formato da BrasilAPI", () => {
    expect(mapearRespostaCep({ street: "Rua A", neighborhood: "Centro", city: "Recife", state: "PE" })).toEqual({
      logradouro: "Rua A",
      bairro: "Centro",
      cidade: "Recife",
      uf: "PE",
    });
  });

  test("retorna null para CEP inexistente ou resposta inválida", () => {
    expect(mapearRespostaCep({ erro: true })).toBeNull();
    expect(mapearRespostaCep(null)).toBeNull();
    expect(mapearRespostaCep({ logradouro: "x" })).toBeNull();
  });
});
