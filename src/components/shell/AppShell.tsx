import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { getSession } from "@/lib/auth";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export async function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const user = await getSession();

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar user={user ?? undefined} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface/80 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="JH Residências" className="h-8 w-auto lg:hidden" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight lg:text-xl">{title}</h1>
              {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>

        <main className="flex-1 px-5 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
