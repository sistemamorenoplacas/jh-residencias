import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — JH Residências",
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; sessionExpired?: string }>;
}

function safeRedirectTo(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/painel";
}

const IconCheck = (
  <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconHouse = (
  <svg className="size-72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" />
  </svg>
);

const BENEFICIOS = [
  "Cobranças por Pix geradas automaticamente",
  "Lembretes e confirmações no WhatsApp",
  "Controle de inadimplência em tempo real",
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { redirectTo, sessionExpired } = await searchParams;
  const target = safeRedirectTo(redirectTo);

  if (session) {
    redirect(target);
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel de marca — só no desktop */}
      <aside
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ background: "linear-gradient(160deg,#041a3d 0%,#052351 55%,#0e3a75 100%)" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
          JH Residências
        </p>

        <div className="relative z-10 max-w-md">
          <h1 className="serif text-4xl leading-tight xl:text-[2.75rem]">
            Gerencie seus aluguéis num só lugar.
          </h1>
          <p className="mt-4 text-white/70">
            Do contrato à cobrança paga — sem planilha, sem correria.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-white/90">
                <span className="text-brand-bright">{IconCheck}</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} JH Residências
        </p>

        <div className="pointer-events-none absolute -bottom-16 -right-16 text-white/[0.06]">
          {IconHouse}
        </div>
      </aside>

      {/* Lado do formulário */}
      <div className="flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <img src="/logo.svg" alt="JH Residências" className="h-36 w-auto" />
            <p className="-mt-2 text-sm text-muted">Painel administrativo</p>
          </div>

          {sessionExpired ? (
            <p className="mb-4 rounded-[10px] border border-pendente/30 bg-pendente-tint px-3 py-2.5 text-center text-sm font-medium text-pendente">
              Sua sessão expirou. Faça login novamente.
            </p>
          ) : null}

          <div className="card-surface p-6 sm:p-7">
            <LoginForm redirectTo={target} />
          </div>

          <p className="mt-6 text-center text-xs text-faint">
            Acesso restrito ao proprietário.
          </p>
        </div>
      </div>
    </main>
  );
}
