"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./Sidebar";

const ICON = "size-[18px] shrink-0";

const IconPerfil = (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
  </svg>
);

export function MobileNav() {
  const pathname = usePathname();
  const perfilAtivo = pathname === "/perfil" || pathname.startsWith("/perfil/");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
              active ? "text-brand" : "text-faint"
            }`}
          >
            {item.icon}
            <span className="leading-none">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
      <Link
        href="/perfil"
        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
          perfilAtivo ? "text-brand" : "text-faint"
        }`}
      >
        {IconPerfil}
        <span className="leading-none">Perfil</span>
      </Link>
    </nav>
  );
}
