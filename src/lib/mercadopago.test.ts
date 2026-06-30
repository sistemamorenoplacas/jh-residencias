import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

import {
  extrairCamposAssinatura,
  mapStatusMpToCharge,
  validarAssinaturaWebhook,
} from "@/lib/mercadopago";

/**
 * Testes das funções PURAS do Mercado Pago — sem rede.
 * A assinatura HMAC é recomputada aqui com o mesmo algoritmo (manifest
 * `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`) para validar de ponta a ponta.
 */

const SECRET = "meu-segredo-mp";
const DATA_ID = "123456";
const REQUEST_ID = "req-abc";
const TS = "1700000000";

/** Reproduz a assinatura `v1` esperada para dados conhecidos. */
function assinarManifest(secret: string): string {
  const manifest = `id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};`;
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("extrairCamposAssinatura", () => {
  it("extrai ts e v1 do header x-signature", () => {
    // Arrange
    const header = "ts=1700000000,v1=abc123";

    // Act
    const parts = extrairCamposAssinatura(header);

    // Assert
    expect(parts).toEqual({ ts: "1700000000", v1: "abc123" });
  });

  it("tolera ordem invertida dos campos e espaços", () => {
    // Arrange
    const header = " v1=abc123 , ts=1700000000 ";

    // Act
    const parts = extrairCamposAssinatura(header);

    // Assert
    expect(parts).toEqual({ ts: "1700000000", v1: "abc123" });
  });

  it("retorna nulls quando o header está ausente", () => {
    // Arrange / Act
    const parts = extrairCamposAssinatura(null);

    // Assert
    expect(parts).toEqual({ ts: null, v1: null });
  });
});

describe("validarAssinaturaWebhook", () => {
  it("valida quando o manifest e o secret estão corretos", () => {
    // Arrange
    const v1 = assinarManifest(SECRET);

    // Act
    const valido = validarAssinaturaWebhook({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });

    // Assert
    expect(valido).toBe(true);
  });

  it("falha quando o secret está errado", () => {
    // Arrange: assinatura gerada com outro secret
    const v1 = assinarManifest("secret-errado");

    // Act
    const valido = validarAssinaturaWebhook({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });

  it("falha quando o dataId não corresponde ao manifest assinado", () => {
    // Arrange
    const v1 = assinarManifest(SECRET);

    // Act
    const valido = validarAssinaturaWebhook({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: REQUEST_ID,
      dataId: "outro-id",
      secret: SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });

  it("retorna false quando o header x-signature está ausente", () => {
    // Arrange / Act
    const valido = validarAssinaturaWebhook({
      xSignature: null,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });

  it("retorna false quando falta o x-request-id", () => {
    // Arrange
    const v1 = assinarManifest(SECRET);

    // Act
    const valido = validarAssinaturaWebhook({
      xSignature: `ts=${TS},v1=${v1}`,
      xRequestId: null,
      dataId: DATA_ID,
      secret: SECRET,
    });

    // Assert
    expect(valido).toBe(false);
  });
});

describe("mapStatusMpToCharge", () => {
  it("mapeia approved -> pago", () => {
    expect(mapStatusMpToCharge("approved")).toBe("pago");
  });

  it("mapeia cancelled -> cancelado", () => {
    expect(mapStatusMpToCharge("cancelled")).toBe("cancelado");
  });

  it.each(["pending", "in_process", "rejected", "refunded"])(
    "mapeia %s -> pendente",
    (status) => {
      expect(mapStatusMpToCharge(status)).toBe("pendente");
    },
  );

  it("trata status desconhecido conservadoramente como pendente", () => {
    expect(mapStatusMpToCharge("status_inexistente")).toBe("pendente");
  });
});
