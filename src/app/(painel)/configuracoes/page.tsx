import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";
import { GerarCobrancasButton } from "@/components/config/GerarCobrancasButton";
import { ConfigForm } from "@/components/config/ConfigForm";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Configurações — JH Residências" };

// Lê secrets só para reportar presença — nenhum valor atravessa a fronteira.
export const dynamic = "force-dynamic";

function temEnv(...nomes: string[]): boolean {
  return nomes.every((n) => {
    const v = process.env[n];
    return typeof v === "string" && v.trim().length > 0;
  });
}

interface Conexao {
  nome: string;
  descricao: string;
  ok: boolean;
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-pago-tint text-pago" : "bg-pendente-tint text-pendente"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ok ? "Conectado" : "Pendente"}
    </span>
  );
}

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  const conexoes: Conexao[] = [
    {
      nome: "Pix (Mercado Pago)",
      descricao: "Geração de Pix/boleto e confirmação de pagamento.",
      ok: temEnv("MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"),
    },
    {
      nome: "WhatsApp",
      descricao: "Envio de cobranças, lembretes e confirmações.",
      ok: temEnv("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"),
    },
    {
      nome: "Banco de dados",
      descricao: "Imóveis, inquilinos, contratos e cobranças.",
      ok: temEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"),
    },
  ];

  return (
    <AppShell title="Configurações" subtitle="Automação e conexões do sistema">
      <div className="flex flex-col gap-6">
        {/* Formulário editável: automação + contato de suporte */}
        <ConfigForm settings={settings} />

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

        {/* Conexões (somente leitura) */}
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              Conexões
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Serviços que fazem o sistema funcionar. Todos precisam estar
              conectados.
            </p>
          </header>
          <ul className="divide-y divide-line">
            {conexoes.map((c) => (
              <li
                key={c.nome}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{c.nome}</p>
                  <p className="text-xs text-faint">{c.descricao}</p>
                </div>
                <StatusPill ok={c.ok} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
