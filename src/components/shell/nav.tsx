import type { ReactNode } from "react";

/** Usuário logado exibido no shell (header/menu de perfil). */
export interface ShellUser {
  email: string | null;
}

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto da barra inferior (celular). */
  short: string;
  icon: ReactNode;
}

const ICON = "size-[18px] shrink-0";

/** Itens de navegação do painel, na ordem em que aparecem no header e na barra mobile. */
export const NAV: NavItem[] = [
  {
    href: "/painel",
    short: "Início",
    label: "Visão geral",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/cobrancas",
    short: "Cobranças",
    label: "Cobranças",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
  {
    href: "/inquilinos",
    short: "Inquilinos",
    label: "Inquilinos",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.5-1.5-4.6-3.7-5.5" />
      </svg>
    ),
  },
  {
    href: "/contratos",
    short: "Contratos",
    label: "Contratos",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M13 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    href: "/imoveis",
    short: "Imóveis",
    label: "Imóveis",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11l8-6 8 6M6 10v9h12v-9M10 19v-5h4v5" />
      </svg>
    ),
  },
  {
    href: "/mensagens",
    short: "Mensagens",
    label: "Mensagens",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      </svg>
    ),
  },
  {
    href: "/configuracoes",
    short: "Ajustes",
    label: "Configurações",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.2a2 2 0 1 1-4 0v-.1a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .7-1.7l-.1-.1A2 2 0 1 1 7.5 4.4l.1.1a1 1 0 0 0 1.7-.7V3.6a2 2 0 1 1 4 0v.1a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1" />
      </svg>
    ),
  },
];

/** Rota ativa: a própria ou uma sub-rota (ex.: /cobrancas/123). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
