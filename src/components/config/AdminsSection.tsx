"use client";

import { useActionState, useState, useTransition } from "react";

import {
  CONVITE_INITIAL_STATE,
  convidarAdministrador,
  gerarLinkConvite,
  removerAdministrador,
  type ConviteState,
} from "@/app/(painel)/configuracoes/admins-actions";
import type { AdminInfo } from "@/lib/admins";

const IconWhatsapp = (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.3 4.4c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5 0 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-2-.9c-.3-.1-.5-.2-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6Z" />
  </svg>
);

/** Painel com o link gerado: WhatsApp + copiar. */
function CompartilharConvite({ convite }: { convite: NonNullable<ConviteState["convite"]> }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(convite.mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="rounded-card border border-brand/20 bg-brand-tint/60 px-4 py-4">
      <p className="text-sm font-semibold text-ink">Convite pronto para {convite.nome}</p>
      <p className="mt-1 text-xs text-muted">
        Envie o link pelo WhatsApp. Ele é pessoal e de uso único — se expirar, gere outro aqui.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={convite.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-pill bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5b]"
        >
          {IconWhatsapp}
          Compartilhar no WhatsApp
        </a>
        <button type="button" onClick={copiar} className="btn-ghost">
          {copiado ? "Copiado!" : "Copiar mensagem"}
        </button>
      </div>
      <p className="mt-3 break-all font-mono text-[11px] text-faint">{convite.link}</p>
    </div>
  );
}

function StatusAdmin({ admin }: { admin: AdminInfo }) {
  if (admin.principal) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-pill bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand">
        Proprietário
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${
        admin.ativo ? "bg-pago-tint text-pago" : "bg-pendente-tint text-pendente"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {admin.ativo ? "Ativo" : "Convite pendente"}
    </span>
  );
}

export function AdminsSection({ admins }: { admins: AdminInfo[] }) {
  const [state, formAction, pending] = useActionState(convidarAdministrador, CONVITE_INITIAL_STATE);
  const [linkState, setLinkState] = useState<ConviteState | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  const convite = linkState?.convite ?? state.convite;

  function gerarLink(userId: string) {
    setErroLista(null);
    startTransition(async () => {
      const result = await gerarLinkConvite(userId);
      if (result.ok) setLinkState(result);
      else setErroLista(result.error);
    });
  }

  function remover(admin: AdminInfo) {
    if (!window.confirm(`Remover ${admin.nome} dos administradores? A conta dessa pessoa será apagada.`)) return;
    setErroLista(null);
    startTransition(async () => {
      const result = await removerAdministrador(admin.userId);
      if (!result.ok) setErroLista(result.error);
      if (linkState?.convite && result.ok) setLinkState(null);
    });
  }

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-ink">Administradores</h2>
        <p className="mt-0.5 text-sm text-muted">
          Quem pode entrar no sistema. Todos veem os mesmos imóveis, contratos e cobranças.
        </p>
      </header>

      <ul className="divide-y divide-line">
        {admins.map((admin) => (
          <li key={admin.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {admin.nome}
                {admin.euMesmo ? <span className="ml-1.5 text-xs font-normal text-faint">(você)</span> : null}
              </p>
              <p className="truncate text-xs text-faint">
                {admin.email}
                {admin.telefone ? ` · ${admin.telefone}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusAdmin admin={admin} />
              {!admin.principal && !admin.ativo ? (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => gerarLink(admin.userId)}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                >
                  Gerar link
                </button>
              ) : null}
              {!admin.principal && !admin.euMesmo ? (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => remover(admin)}
                  className="btn-ghost px-2.5 py-1.5 text-xs text-vencido hover:border-vencido/40"
                >
                  Remover
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {erroLista ? (
        <p role="alert" className="mx-5 mb-3 rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido">
          {erroLista}
        </p>
      ) : null}

      <div className="border-t border-line px-5 py-4">
        {convite ? (
          <div className="mb-4">
            <CompartilharConvite convite={convite} />
          </div>
        ) : null}

        <p className="mb-3 text-sm font-semibold text-ink">Novo administrador</p>
        <form action={formAction} className="grid gap-3 sm:grid-cols-3" noValidate>
          <div>
            <label htmlFor="admin-nome" className="label">Nome</label>
            <input id="admin-nome" name="nome" required minLength={2} maxLength={80} className="field" placeholder="Maria Souza" />
          </div>
          <div>
            <label htmlFor="admin-email" className="label">E-mail</label>
            <input id="admin-email" name="email" type="email" required className="field" placeholder="maria@exemplo.com" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="admin-telefone" className="label">WhatsApp (opcional)</label>
            <input id="admin-telefone" name="telefone" type="tel" className="field" placeholder="(62) 99999-0000" autoComplete="off" />
          </div>
          {state.error ? (
            <p role="alert" className="sm:col-span-3 rounded-[10px] border border-vencido/20 bg-vencido-tint px-3 py-2 text-sm font-medium text-vencido">
              {state.error}
            </p>
          ) : null}
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Criando…" : "Criar e gerar convite"}
            </button>
            <p className="text-xs text-faint">A pessoa cria a própria senha ao abrir o link.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
