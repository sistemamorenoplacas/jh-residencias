"use client";

import { useEffect, useRef } from "react";

/**
 * Dispara um beacon "abriu o link" uma vez por carregamento da página de
 * pagamento. Só roda no navegador (após hidratação), por isso previews de
 * link do WhatsApp não geram registro.
 */
export function RegistrarAbertura({ chargeId, pagina }: { chargeId: string; pagina: "pix" | "boleto" }) {
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    const body = JSON.stringify({ chargeId, pagina });
    fetch("/api/rastreio/abertura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* rastreio é best-effort */
    });
  }, [chargeId, pagina]);

  return null;
}
