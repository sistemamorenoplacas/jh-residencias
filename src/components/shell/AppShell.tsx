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
        <header className="border-b border-line-strong bg-surface/70 px-5 py-4 backdrop-blur lg:px-9 lg:py-6">
          <img
            src="/logo.svg"
            alt="JH Residências"
            className="mb-3 h-24 w-auto lg:hidden"
          />
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {subtitle ? <p className="kicker mb-1.5">{subtitle}</p> : null}
              <h1 className="serif text-[1.6rem] leading-tight text-ink lg:text-[2rem]">
                {title}
              </h1>
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="flex-1 px-5 py-7 pb-24 lg:px-9 lg:pb-9">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
