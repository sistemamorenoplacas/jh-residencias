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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { redirectTo, sessionExpired } = await searchParams;
  const target = safeRedirectTo(redirectTo);

  if (session) {
    redirect(target);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="JH Residências" className="h-20 w-auto" />
          <p className="mt-0.5 text-sm text-muted">
            Painel administrativo de cobranças
          </p>
        </div>

        {sessionExpired ? (
          <p className="mb-4 rounded-[10px] border border-pendente/30 bg-pendente-tint px-3 py-2.5 text-sm font-medium text-pendente text-center">
            Sua sessão expirou. Faça login novamente.
          </p>
        ) : null}

        <div className="card-surface p-6">
          <LoginForm redirectTo={target} />
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Acesso restrito ao proprietário.
        </p>
      </div>
    </main>
  );
}
