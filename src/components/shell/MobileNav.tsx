"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

import { signOut } from "@/app/login/actions";
import { NAV, isActive } from "./nav";

const ICON = "size-[18px] shrink-0";

/** Rotas principais na barra inferior; o resto vai para o menu "Mais". */
const PRIMARY = ["/painel", "/cobrancas", "/inquilinos", "/imoveis"];

const IconMore = (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
  </svg>
);
const IconPerfil = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
  </svg>
);
const IconLogout = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const primaryItems = PRIMARY.map((h) => NAV.find((n) => n.href === h)).filter(
    (n): n is (typeof NAV)[number] => Boolean(n),
  );
  const extraItems = NAV.filter((n) => !PRIMARY.includes(n.href));
  const maisAtivo =
    extraItems.some((n) => isActive(pathname, n.href)) || isActive(pathname, "/perfil");

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="mobile-bar fixed inset-x-3 z-30 flex items-stretch rounded-[22px] border border-line bg-surface/92 shadow-[0_18px_40px_-18px_rgba(5,35,81,0.45)] backdrop-blur-md lg:hidden"
      >
        {primaryItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`mobile-bar-item ${active ? "is-active" : ""}`}
            >
              <span className="mobile-bar-icon">{item.icon}</span>
              <span>{item.short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mobile-bar-item ${maisAtivo ? "is-active" : ""}`}
          aria-label="Mais opções"
          aria-haspopup="dialog"
        >
          <span className="mobile-bar-icon">{IconMore}</span>
          <span>Mais</span>
        </button>
      </nav>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Mais opções"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full rounded-t-shell border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
                  Mais opções
                </p>
                <div className="flex flex-col">
                  {extraItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                        isActive(pathname, item.href)
                          ? "bg-brand-tint text-brand"
                          : "text-ink hover:bg-canvas"
                      }`}
                    >
                      <span className="text-muted">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/perfil"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                      isActive(pathname, "/perfil")
                        ? "bg-brand-tint text-brand"
                        : "text-ink hover:bg-canvas"
                    }`}
                  >
                    <span className="text-muted">{IconPerfil}</span>
                    Meu perfil
                  </Link>

                  <div className="my-2 h-px bg-line" />

                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-vencido hover:bg-vencido-tint"
                    >
                      <span>{IconLogout}</span>
                      Sair da conta
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
