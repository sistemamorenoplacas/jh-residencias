import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — JH Residências",
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

function safeRedirectTo(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/painel";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { redirectTo } = await searchParams;
  const target = safeRedirectTo(redirectTo);

  if (session) {
    redirect(target);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-shell bg-sidebar text-base font-bold text-white">
            JH
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              JH Residências
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Painel administrativo de cobranças
            </p>
          </div>
        </div>

        <div className="card-surface p-6 shadow-[0_1px_2px_rgba(20,32,25,0.04),0_8px_24px_-12px_rgba(20,32,25,0.12)]">
          <LoginForm redirectTo={target} />
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Acesso restrito ao proprietário.
        </p>
      </div>
    </main>
  );
}
