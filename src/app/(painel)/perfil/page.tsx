import { AppShell } from "@/components/shell/AppShell";
import { requireUser } from "@/lib/auth";
import { NomeForm, SenhaForm } from "./PerfilForm";
import { signOut } from "@/app/login/actions";

export const metadata = { title: "Perfil — JH Residências" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export default async function PerfilPage() {
  const user = await requireUser();
  const nomeAtual = user.email?.split("@")[0] ?? "Administrador";

  return (
    <AppShell title="Perfil" subtitle="Gerencie sua conta">
      <div className="flex max-w-lg flex-col gap-6">
        <Section title="Informações da conta">
          <div className="mb-4 rounded-lg bg-canvas px-4 py-3">
            <p className="text-xs text-faint">E-mail da conta</p>
            <p className="mt-0.5 text-sm font-medium text-ink">{user.email}</p>
          </div>
          <NomeForm nomeAtual={nomeAtual} />
        </Section>

        <Section title="Alterar senha">
          <SenhaForm />
        </Section>

        <Section title="Sessão">
          <p className="mb-4 text-sm text-muted">
            Ao sair, você será redirecionado para a página de login.
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-vencido px-4 py-2 text-sm font-medium text-vencido transition-colors hover:bg-vencido-tint"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sair da conta
            </button>
          </form>
        </Section>
      </div>
    </AppShell>
  );
}
