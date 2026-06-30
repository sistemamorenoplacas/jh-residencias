import { AppShell } from "@/components/shell/AppShell";

/**
 * Página de status das integrações.
 *
 * Server Component. Lê as variáveis de ambiente APENAS para reportar
 * presença/ausência ("configurado" / "ausente"). NUNCA expõe o valor de
 * nenhum secret ao client — só o booleano de presença atravessa a fronteira.
 *
 * Como é renderizada no server e não passa valores ao browser, é seguro ler
 * `process.env` diretamente aqui. Checamos cada variável de forma
 * independente (em vez de `serverEnv()`, que lança se qualquer uma faltar)
 * para que a própria página de diagnóstico funcione mesmo com config parcial.
 */

interface EnvVarSpec {
  name: string;
  descricao: string;
}

interface IntegracaoGrupo {
  titulo: string;
  resumo: string;
  vars: EnvVarSpec[];
}

const GRUPOS: IntegracaoGrupo[] = [
  {
    titulo: "Supabase",
    resumo: "Banco de dados, autenticação e RLS por proprietário.",
    vars: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", descricao: "URL do projeto Supabase" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", descricao: "Chave pública (anon) — respeita RLS" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", descricao: "Chave de serviço — ignora RLS (cron/webhooks)" },
    ],
  },
  {
    titulo: "Mercado Pago",
    resumo: "Geração de Pix e confirmação de pagamento via webhook.",
    vars: [
      { name: "MP_ACCESS_TOKEN", descricao: "Token de acesso da API" },
      { name: "MP_WEBHOOK_SECRET", descricao: "Segredo para validar a assinatura do webhook" },
    ],
  },
  {
    titulo: "WhatsApp (Graph API)",
    resumo: "Envio de cobranças, lembretes e confirmações por template.",
    vars: [
      { name: "WHATSAPP_TOKEN", descricao: "Bearer token da Graph API" },
      { name: "WHATSAPP_PHONE_NUMBER_ID", descricao: "ID do número remetente" },
      { name: "WHATSAPP_VERIFY_TOKEN", descricao: "Token de verificação do webhook (GET)" },
      { name: "WHATSAPP_APP_SECRET", descricao: "App secret para validar X-Hub-Signature-256" },
    ],
  },
  {
    titulo: "Automação",
    resumo: "Rotinas agendadas (geração de cobranças, lembretes, baixa de vencidas).",
    vars: [
      { name: "CRON_SECRET", descricao: "Segredo que autentica as chamadas de cron" },
      { name: "APP_BASE_URL", descricao: "URL base pública da aplicação" },
    ],
  },
];

/** True somente se a variável existe e não é string vazia. Não retorna o valor. */
function estaConfigurada(name: string): boolean {
  const valor = process.env[name];
  return typeof valor === "string" && valor.trim().length > 0;
}

function StatusBadge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-pago-tint px-2.5 py-1 text-xs font-semibold text-pago">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Configurado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-vencido-tint px-2.5 py-1 text-xs font-semibold text-vencido">
      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      Ausente
    </span>
  );
}

function IntegracaoCard({ grupo }: { grupo: IntegracaoGrupo }) {
  const status = grupo.vars.map((v) => ({ ...v, ok: estaConfigurada(v.name) }));
  const configuradas = status.filter((s) => s.ok).length;
  const total = status.length;
  const tudoOk = configuradas === total;

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink">{grupo.titulo}</h2>
          <p className="mt-0.5 text-sm text-muted">{grupo.resumo}</p>
        </div>
        <span
          className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
            tudoOk ? "bg-pago-tint text-pago" : "bg-pendente-tint text-pendente"
          }`}
        >
          {configuradas}/{total}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {status.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium text-ink">{s.name}</p>
              <p className="truncate text-xs text-faint">{s.descricao}</p>
            </div>
            <StatusBadge ok={s.ok} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ConfiguracoesPage() {
  const todasVars = GRUPOS.flatMap((g) => g.vars);
  const totalConfiguradas = todasVars.filter((v) => estaConfigurada(v.name)).length;
  const total = todasVars.length;

  return (
    <AppShell
      title="Configurações"
      subtitle="Status das integrações"
    >
      <section className="mb-6 rounded-card border border-line bg-surface px-5 py-4">
        <p className="text-sm text-muted">
          {totalConfiguradas} de {total} variáveis de ambiente configuradas. Os valores
          dos segredos nunca são exibidos — apenas a presença é verificada no servidor.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {GRUPOS.map((grupo) => (
          <IntegracaoCard key={grupo.titulo} grupo={grupo} />
        ))}
      </div>

      <section className="mt-8 rounded-card border border-line bg-surface px-5 py-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">Como configurar</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm text-muted">
          <li>
            <span className="font-medium text-ink">1.</span> Defina as variáveis ausentes no
            painel da Vercel (Project Settings → Environment Variables) ou no arquivo{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink">.env.local</code>{" "}
            em desenvolvimento.
          </li>
          <li>
            <span className="font-medium text-ink">2.</span> As chaves{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink">NEXT_PUBLIC_*</code>{" "}
            são expostas ao navegador; as demais são secretas e ficam apenas no servidor.
          </li>
          <li>
            <span className="font-medium text-ink">3.</span> Após alterar variáveis na Vercel,
            refaça o deploy para que entrem em vigor.
          </li>
          <li>
            <span className="font-medium text-ink">4.</span> Consulte{" "}
            <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink">.env.example</code>{" "}
            para a lista completa e o formato esperado de cada variável.
          </li>
        </ol>
      </section>
    </AppShell>
  );
}
