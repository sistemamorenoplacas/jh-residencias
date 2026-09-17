"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DashboardIcon } from "@/components/dashboard/DashboardIcon";
import { NAV, isActive, type ShellUser } from "./nav";
import { ProfileMenu } from "./ProfileMenu";

/** Mensagens e Configurações saem das pílulas e viram ícones à direita. */
const ICON_ONLY = ["/mensagens", "/configuracoes"];

export function DashboardNav({ user }: { user?: ShellUser }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/painel";

  return (
    <header className="estate-header">
      <Link
        href="/painel"
        className="estate-brand"
        aria-label="JH Residências — início"
      >
        <Image
          src="/logo-compacta.svg"
          alt="JH Residências"
          width={100}
          height={106}
          className="estate-brand-logo estate-brand-logo--dark"
          loading="lazy"
        />
        {/* Versão branca para o topo navy do celular (<=700px). */}
        <Image
          src="/logo-branca.png"
          alt=""
          width={1500}
          height={1333}
          className="estate-brand-logo estate-brand-logo--light"
          sizes="120px"
        />
      </Link>
      <nav className="estate-navigation" aria-label="Navegação principal">
        {NAV.filter((item) => !ICON_ONLY.includes(item.href)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="estate-header-actions">
        {isDashboard ? (
          <Link
            href="#dashboard-search"
            className="estate-icon-button estate-search-shortcut"
            aria-label="Buscar cobranças"
            title="Buscar cobranças"
          >
            <DashboardIcon name="search" />
          </Link>
        ) : null}
        <Link
          href="/mensagens"
          className="estate-icon-button estate-action-messages"
          aria-label="Mensagens"
          title="Mensagens"
          aria-current={isActive(pathname, "/mensagens") ? "page" : undefined}
        >
          <DashboardIcon name="message" className="estate-only-desktop" />
          <DashboardIcon name="bell" className="estate-only-mobile" />
        </Link>
        <Link
          href="/configuracoes"
          className="estate-icon-button estate-action-settings"
          aria-label="Configurações"
          title="Configurações"
          aria-current={isActive(pathname, "/configuracoes") ? "page" : undefined}
        >
          <DashboardIcon name="settings" />
        </Link>
        <ProfileMenu user={user} compact />
      </div>
    </header>
  );
}
