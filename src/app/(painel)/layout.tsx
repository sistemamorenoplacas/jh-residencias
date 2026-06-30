import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";

/**
 * Layout do grupo (painel).
 *
 * Server Component que protege TODO o grupo: `requireUser()` redireciona para
 * `/login` quando não há sessão. Funciona como guard de defesa-em-profundidade
 * em conjunto com o middleware (que já bloqueia no edge) — aqui a checagem é
 * por request server-side, garantindo a sessão antes de renderizar qualquer
 * página do painel.
 *
 * Não renderiza shell/sidebar: cada página do painel usa `AppShell`
 * diretamente. Este layout só faz o guard e repassa `children`.
 */
export default async function PainelLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return children;
}
