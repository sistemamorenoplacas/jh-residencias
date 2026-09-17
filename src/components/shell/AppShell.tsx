import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { DashboardNav } from "./DashboardNav";
import { getSession } from "@/lib/auth";
import "@/components/dashboard/dashboard.css";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * `dashboard`: a página traz o próprio hero/h1 (Visão geral).
   * `default`: o shell renderiza o cabeçalho da página (título, subtítulo, ações).
   */
  variant?: "default" | "dashboard";
}

/**
 * Shell único do painel: header com logo + navegação em pílulas (DashboardNav),
 * conteúdo centralizado (`.estate-main`) e barra inferior no celular (MobileNav).
 * Os estilos vivem em `dashboard.css`, escopados em `.estate-shell`.
 */
export async function AppShell({ title, subtitle, actions, children, variant = "default" }: AppShellProps) {
  const user = await getSession();

  return (
    <div className="estate-shell">
      <DashboardNav user={user ?? undefined} />
      <main className="estate-main" aria-label={title}>
        {variant === "dashboard" ? (
          children
        ) : (
          <>
            <header className="estate-page-header">
              <div className="min-w-0">
                <h1>{title}</h1>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
              {actions ? <div className="estate-page-actions">{actions}</div> : null}
            </header>
            <div className="estate-page-body">{children}</div>
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
