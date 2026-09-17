import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";
import { GerarCobrancasButton } from "@/components/config/GerarCobrancasButton";
import { ConfigForm } from "@/components/config/ConfigForm";
import { AdminsSection } from "@/components/config/AdminsSection";
import { listarAdministradores } from "@/lib/admins";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Configurações — JH Residências" };

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const [settings, admins] = await Promise.all([
    getSettings(user.ownerId),
    listarAdministradores(user).catch(() => null),
  ]);

  return (
    <AppShell title="Configurações" subtitle="Automação e conexões do sistema">
      <div className="flex flex-col gap-6">
        {/* Formulário editável: automação + contato de suporte */}
        <ConfigForm settings={settings} />

        {/* Administradores adicionais + convite por WhatsApp */}
        {admins ? (
          <AdminsSection admins={admins} />
        ) : (
          <section className="rounded-card border border-line bg-surface px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-ink">Administradores</h2>
            <p className="mt-1 text-sm text-vencido">
              Não foi possível carregar os administradores. Verifique se a migração 0007 foi aplicada.
            </p>
          </section>
        )}

        {/* Ação manual: gerar cobranças do mês agora */}
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Cobrar agora
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Gera as cobranças do mês atual sem esperar o dia 1º.
            </p>
          </header>
          <div className="px-5 py-4">
            <p className="mb-3 text-xs text-muted">
              Cria e envia as cobranças de todos os contratos ativos. Quem já foi
              cobrado neste mês é ignorado (não recebe de novo).
            </p>
            <GerarCobrancasButton />
          </div>
        </section>

      </div>
    </AppShell>
  );
}
