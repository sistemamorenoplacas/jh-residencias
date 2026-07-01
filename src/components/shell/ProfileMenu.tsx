"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { signOut } from "@/app/login/actions";
import { NomeForm, SenhaForm } from "@/app/(painel)/perfil/PerfilForm";
import type { SidebarUser } from "./Sidebar";

const IconLogout = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const IconClose = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Chip de perfil da sidebar: abre as configurações de perfil num pop-up
 * (editar nome + trocar senha) e mantém o botão "Sair" ao lado. O logout
 * usa a Server Action `signOut` via `<form action>`.
 */
export function ProfileMenu({ user }: { user?: SidebarUser }) {
  const [open, setOpen] = useState(false);
  const email = user?.email ?? "Administrador";
  const inicial = user?.email?.[0]?.toUpperCase() ?? "A";
  const nomeAtual = email.split("@")[0];

  return (
    <>
      <div className="flex items-center gap-1 px-1.5 pb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-canvas"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-base font-semibold text-brand">
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-faint">Bem-vindo,</p>
            <p className="truncate text-sm font-semibold text-ink">{nomeAtual}</p>
          </div>
        </button>

        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sair da conta"
            title="Sair"
            className="flex size-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-vencido-tint hover:text-vencido"
          >
            {IconLogout}
          </button>
        </form>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Configurações de perfil"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-shell border border-line bg-surface p-6 shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="kicker mb-1">Minha conta</p>
                <h2 className="serif text-xl text-ink">Perfil</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                {IconClose}
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-canvas px-4 py-3">
              <p className="text-xs text-faint">E-mail da conta</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{email}</p>
            </div>

            <NomeForm nomeAtual={nomeAtual} />

            <div className="my-5 h-px bg-line" />

            <p className="mb-3 text-sm font-semibold text-ink">Alterar senha</p>
            <SenhaForm />
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
