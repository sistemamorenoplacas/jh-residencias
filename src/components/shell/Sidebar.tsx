"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface SidebarUser {
  email: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const ICON = "size-[18px] shrink-0";

export const NAV: NavItem[] = [
  {
    href: "/painel",
    label: "Visão geral",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/cobrancas",
    label: "Cobranças",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
  {
    href: "/inquilinos",
    label: "Inquilinos",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.5-1.5-4.6-3.7-5.5" />
      </svg>
    ),
  },
  {
    href: "/contratos",
    label: "Contratos",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M13 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    href: "/imoveis",
    label: "Imóveis",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11l8-6 8 6M6 10v9h12v-9M10 19v-5h4v5" />
      </svg>
    ),
  },
  {
    href: "/mensagens",
    label: "Mensagens",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      </svg>
    ),
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.2a2 2 0 1 1-4 0v-.1a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .7-1.7l-.1-.1A2 2 0 1 1 7.5 4.4l.1.1a1 1 0 0 0 1.7-.7V3.6a2 2 0 1 1 4 0v.1a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ user }: { user?: SidebarUser }) {
  const pathname = usePathname();
  const inicial = user?.email?.[0]?.toUpperCase() ?? "A";
  const emailDisplay = user?.email ?? "Administrador";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-sidebar px-4 py-6 lg:flex">
      {/* Marca + wordmark */}
      <div className="px-1.5 pb-6">
        <img src="/logo.svg" alt="JH Residências" className="h-11 w-auto" />
        <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-sidebar-text/70">
          Gestão de Aluguéis
        </p>
      </div>

      <div className="mb-3 h-px bg-white/10" />

      <p className="mb-2 px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-text/50">
        Navegação
      </p>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item, i) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-2.5 text-[13px] font-medium tracking-tight transition-colors ${
                active
                  ? "bg-sidebar-elevated text-white"
                  : "text-sidebar-text hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {/* Marcador de ativo — barra vertical (referência blueprint) */}
              <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-active transition-opacity ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={
                  active
                    ? "text-sidebar-active"
                    : "text-sidebar-text/70 transition-colors group-hover:text-sidebar-text"
                }
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              <span className="font-mono text-[10px] tabular-nums text-sidebar-text/40">
                {String(i + 1).padStart(2, "0")}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 h-px bg-white/10" />

      <Link
        href="/perfil"
        className={`mt-3 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.05] ${
          isActive(pathname, "/perfil") ? "bg-white/[0.07]" : ""
        }`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active/15 font-serif text-sm font-semibold text-sidebar-active">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white">Meu perfil</p>
          <p className="truncate font-mono text-[10px] text-sidebar-text/70">{emailDisplay}</p>
        </div>
      </Link>
    </aside>
  );
}
