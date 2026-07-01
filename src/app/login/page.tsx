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

const IconHouse = (
  <svg className="size-[26rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" />
  </svg>
);

const DOT_GRID =
  "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { redirectTo, sessionExpired } = await searchParams;
  const target = safeRedirectTo(redirectTo);

  if (session) {
    redirect(target);
  }

  return (
    <main
      className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10"
      style={{ background: "linear-gradient(160deg,#041a3d 0%,#052351 52%,#0e3a75 100%)" }}
    >
      {/* Grade de pontos */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DOT_GRID, backgroundSize: "22px 22px" }}
      />
      {/* Brilho ambiente */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(43,98,181,0.35), transparent 70%)" }}
      />
      {/* Casa decorativa */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 text-white/[0.04]">
        {IconHouse}
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <img
            src="/logo-branca.png"
            alt="JH Residências"
            className="h-36 w-auto"
          />
          <p className="mt-4 text-sm text-white/55">
            Gerencie seus aluguéis num só lugar.
          </p>
        </div>

        {sessionExpired ? (
          <p className="mb-4 rounded-[10px] border border-pendente/40 bg-pendente-tint px-3 py-2.5 text-center text-sm font-medium text-pendente">
            Sua sessão expirou. Faça login novamente.
          </p>
        ) : null}

        <div className="card-surface p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] sm:p-7">
          <LoginForm redirectTo={target} />
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Acesso restrito ao proprietário.
        </p>
      </div>
    </main>
  );
}
