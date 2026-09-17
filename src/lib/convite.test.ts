import { describe, expect, test } from "vitest";

import {
  isTipoConvite,
  mensagemConvite,
  montarLinkConvite,
  normalizarTelefoneWhatsapp,
  urlWhatsappConvite,
} from "./convite";

describe("montarLinkConvite", () => {
  test("monta a URL de ativação com token e tipo", () => {
    const link = montarLinkConvite("https://app.exemplo.com", "abc123", "invite");
    expect(link).toBe("https://app.exemplo.com/login/convite?token_hash=abc123&type=invite");
  });

  test("escapa caracteres especiais do token", () => {
    const link = montarLinkConvite("https://app.exemplo.com/", "a+b/c=", "magiclink");
    expect(new URL(link).searchParams.get("token_hash")).toBe("a+b/c=");
  });
});

describe("isTipoConvite", () => {
  test("aceita só invite e magiclink", () => {
    expect(isTipoConvite("invite")).toBe(true);
    expect(isTipoConvite("magiclink")).toBe(true);
    expect(isTipoConvite("recovery")).toBe(false);
    expect(isTipoConvite(undefined)).toBe(false);
  });
});

describe("normalizarTelefoneWhatsapp", () => {
  test("adiciona DDI 55 a celular com DDD", () => {
    expect(normalizarTelefoneWhatsapp("(62) 99999-1234")).toBe("5562999991234");
  });

  test("mantém número que já tem DDI", () => {
    expect(normalizarTelefoneWhatsapp("+55 62 99999-1234")).toBe("5562999991234");
  });

  test("aceita fixo com 10 dígitos", () => {
    expect(normalizarTelefoneWhatsapp("6233331234")).toBe("556233331234");
  });

  test("retorna null quando vazio ou incompleto", () => {
    expect(normalizarTelefoneWhatsapp("")).toBeNull();
    expect(normalizarTelefoneWhatsapp(null)).toBeNull();
    expect(normalizarTelefoneWhatsapp("9999")).toBeNull();
  });
});

describe("mensagemConvite", () => {
  test("usa o primeiro nome e inclui o link", () => {
    const msg = mensagemConvite("Maria Helena Souza", "https://x/login/convite?token_hash=t&type=invite");
    expect(msg).toContain("Olá, Maria!");
    expect(msg).toContain("https://x/login/convite?token_hash=t&type=invite");
  });
});

describe("urlWhatsappConvite", () => {
  test("com telefone, abre a conversa do contato com o texto", () => {
    const url = urlWhatsappConvite("62 99999-1234", "oi & tchau");
    expect(url).toBe("https://wa.me/5562999991234?text=oi%20%26%20tchau");
  });

  test("sem telefone, deixa o WhatsApp escolher o contato", () => {
    expect(urlWhatsappConvite(null, "oi")).toBe("https://wa.me/?text=oi");
  });
});
