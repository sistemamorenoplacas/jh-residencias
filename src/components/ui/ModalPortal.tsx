"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza `children` em `document.body` via portal.
 *
 * Overlays com `position: fixed` (modais, sheets) ficam presos quando um
 * ancestral cria um containing block — ex.: a animação `.rise` anima `transform`,
 * e qualquer `transform`/`filter`/`backdrop-filter` no caminho reposiciona o
 * `fixed` para relativo ao ancestral, não à viewport. Portar para o `body`
 * garante que o overlay cubra a tela inteira e centralize corretamente.
 *
 * O guard de `typeof document` evita executar no SSR (onde não há `document`);
 * estes overlays só montam após interação no cliente, então não há divergência
 * de hidratação.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
