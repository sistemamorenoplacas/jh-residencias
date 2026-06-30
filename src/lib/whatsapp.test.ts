import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

import {
  parseStatuses,
  validarXHubSignature,
  verificarWebhook,
} from "@/lib/whatsapp";

/**
 * Testes das funções PURAS do WhatsApp Cloud API — sem rede.
 * A assinatura X-Hub é recomputada com o mesmo HMAC-SHA256 do corpo cru.
 */

const APP_SECRET = "app-secret-xyz";
const VERIFY_TOKEN = "verify-token-123";

/** Gera o header `X-Hub-Signature-256` para um corpo cru e secret dados. */
function assinarXHub(rawBody: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `sha256=${digest}`;
}

describe("validarXHubSignature", () => {
  it("valida assinatura correta do corpo cru", () => {
    // Arrange
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const header = assinarXHub(rawBody, APP_SECRET);

    // Act
    const valido = validarXHubSignature({ rawBody, header, appSecret: APP_SECRET });

    // Assert
    expect(valido).toBe(true);
  });

  it("falha quando o secret está errado", () => {
    // Arrange
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const header = assinarXHub(rawBody, "secret-errado");

    // Act
    const valido = validarXHubSignature({ rawBody, header, appSecret: APP_SECRET });

    // Assert
    expect(valido).toBe(false);
  });

  it("falha quando o corpo foi adulterado", () => {
    // Arrange: assina um corpo, valida outro
    const original = JSON.stringify({ valor: 100 });
    const header = assinarXHub(original, APP_SECRET);
    const adulterado = JSON.stringify({ valor: 999 });

    // Act
    const valido = validarXHubSignature({
      rawBody: adulterado,
      header,
      appSecret: APP_SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });

  it("retorna false quando o header está ausente", () => {
    // Arrange / Act
    const valido = validarXHubSignature({
      rawBody: "{}",
      header: null,
      appSecret: APP_SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });

  it("retorna false quando o header não tem o prefixo sha256=", () => {
    // Arrange
    const rawBody = "{}";
    const semPrefixo = createHmac("sha256", APP_SECRET)
      .update(rawBody, "utf8")
      .digest("hex");

    // Act
    const valido = validarXHubSignature({
      rawBody,
      header: semPrefixo,
      appSecret: APP_SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });
});

describe("verificarWebhook", () => {
  it("retorna o challenge quando mode=subscribe e token confere", () => {
    // Arrange / Act
    const resultado = verificarWebhook({
      mode: "subscribe",
      token: VERIFY_TOKEN,
      challenge: "desafio-42",
      verifyToken: VERIFY_TOKEN,
    });

    // Assert
    expect(resultado).toBe("desafio-42");
  });

  it("retorna null quando o token não confere", () => {
    // Arrange / Act
    const resultado = verificarWebhook({
      mode: "subscribe",
      token: "token-errado",
      challenge: "desafio-42",
      verifyToken: VERIFY_TOKEN,
    });

    // Assert
    expect(resultado).toBeNull();
  });

  it("retorna null quando o mode não é subscribe", () => {
    // Arrange / Act
    const resultado = verificarWebhook({
      mode: "unsubscribe",
      token: VERIFY_TOKEN,
      challenge: "desafio-42",
      verifyToken: VERIFY_TOKEN,
    });

    // Assert
    expect(resultado).toBeNull();
  });

  it("retorna null quando o challenge está ausente", () => {
    // Arrange / Act
    const resultado = verificarWebhook({
      mode: "subscribe",
      token: VERIFY_TOKEN,
      challenge: null,
      verifyToken: VERIFY_TOKEN,
    });

    // Assert
    expect(resultado).toBeNull();
  });
});

describe("parseStatuses", () => {
  it("mapeia os statuses da Meta para o shape do banco", () => {
    // Arrange
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: "wamid.1", status: "sent" },
                  { id: "wamid.2", status: "delivered" },
                  { id: "wamid.3", status: "read" },
                  { id: "wamid.4", status: "failed" },
                ],
              },
            },
          ],
        },
      ],
    };

    // Act
    const updates = parseStatuses(payload);

    // Assert
    expect(updates).toEqual([
      { wamid: "wamid.1", status: "enviado" },
      { wamid: "wamid.2", status: "entregue" },
      { wamid: "wamid.3", status: "lido" },
      { wamid: "wamid.4", status: "falhou" },
    ]);
  });

  it("ignora statuses não reconhecidos", () => {
    // Arrange
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: "wamid.1", status: "deleted" },
                  { id: "wamid.2", status: "sent" },
                ],
              },
            },
          ],
        },
      ],
    };

    // Act
    const updates = parseStatuses(payload);

    // Assert
    expect(updates).toEqual([{ wamid: "wamid.2", status: "enviado" }]);
  });

  it("ignora entradas malformadas (sem id ou status)", () => {
    // Arrange
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { status: "sent" }, // sem id
                  { id: "wamid.x" }, // sem status
                  { id: 123, status: "read" }, // id não-string
                ],
              },
            },
          ],
        },
      ],
    };

    // Act
    const updates = parseStatuses(payload);

    // Assert
    expect(updates).toEqual([]);
  });

  it("retorna lista vazia para payload sem entry", () => {
    expect(parseStatuses({})).toEqual([]);
  });

  it("retorna lista vazia para payload não-objeto", () => {
    expect(parseStatuses(null)).toEqual([]);
    expect(parseStatuses("texto")).toEqual([]);
  });

  it("agrega statuses de múltiplas entries e changes", () => {
    // Arrange
    const payload = {
      entry: [
        { changes: [{ value: { statuses: [{ id: "a", status: "sent" }] } }] },
        { changes: [{ value: { statuses: [{ id: "b", status: "read" }] } }] },
      ],
    };

    // Act
    const updates = parseStatuses(payload);

    // Assert
    expect(updates).toEqual([
      { wamid: "a", status: "enviado" },
      { wamid: "b", status: "lido" },
    ]);
  });
});
