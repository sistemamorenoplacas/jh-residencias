import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — JH Residências",
  description:
    "Como o JH Residências coleta, usa, compartilha e protege dados pessoais no processo de cobrança de aluguéis.",
  robots: { index: true, follow: true },
};

/**
 * Política de Privacidade (rota PÚBLICA — fora do grupo `(painel)`, sem auth).
 *
 * Exigida pela Meta (WhatsApp Cloud API) e pelo Mercado Pago, e obrigatória
 * pela LGPD (Lei 13.709/2018). Precisa estar acessível publicamente, sem
 * bloqueio geográfico, para a validação do app Meta passar.
 *
 * ⚠️ EDITE os campos marcados com [EDITAR] antes de publicar: razão social,
 * CNPJ, e-mail de contato e endereço do controlador.
 */

const ULTIMA_ATUALIZACAO = "6 de julho de 2026";

// [EDITAR] Dados do controlador (responsável pelo tratamento dos dados).
const CONTROLADOR = {
  nome: "JH Residências",
  email: "contato@jhresidencias.com",
};

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#052351]">{titulo}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-full bg-slate-50">
      <header className="bg-[#052351] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-white/70">{CONTROLADOR.nome}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Última atualização: {ULTIMA_ATUALIZACAO}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[15px] leading-relaxed text-slate-700">
          Esta Política de Privacidade descreve como o {CONTROLADOR.nome}{" "}
          (&ldquo;nós&rdquo;) coleta, utiliza, compartilha e protege dados
          pessoais no âmbito do sistema de administração e cobrança de aluguéis.
          O tratamento segue a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018 — LGPD).
        </p>

        <Secao titulo="1. Quem somos">
          <p>
            O {CONTROLADOR.nome} é uma plataforma de gestão de imóveis, contratos
            de locação e cobrança de aluguéis. Atuamos como controladores dos
            dados pessoais tratados na plataforma. Dúvidas sobre privacidade
            podem ser enviadas para{" "}
            <a
              href={`mailto:${CONTROLADOR.email}`}
              className="font-medium text-[#052351] underline"
            >
              {CONTROLADOR.email}
            </a>
            .
          </p>
        </Secao>

        <Secao titulo="2. Dados que coletamos">
          <p>Tratamos as seguintes categorias de dados pessoais:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Usuários do painel (administradores):</strong> e-mail e
              credenciais de acesso, usados para autenticação.
            </li>
            <li>
              <strong>Inquilinos:</strong> nome, telefone (WhatsApp), e-mail,
              CPF e endereço (CEP, logradouro, número, bairro, cidade e UF).
            </li>
            <li>
              <strong>Contratos e cobranças:</strong> valores, datas de
              vencimento, competências, status de pagamento e identificadores de
              transação.
            </li>
            <li>
              <strong>Dados técnicos:</strong> cookies estritamente necessários
              para manter a sessão autenticada.
            </li>
          </ul>
        </Secao>

        <Secao titulo="3. Como usamos os dados">
          <ul className="list-disc space-y-1 pl-5">
            <li>Gerenciar imóveis, contratos de locação e inquilinos.</li>
            <li>
              Gerar cobranças e processar pagamentos (Pix e boleto) dos
              aluguéis.
            </li>
            <li>
              Enviar notificações transacionais por WhatsApp — como avisos de
              cobrança, lembretes de vencimento e confirmações de pagamento —
              referentes exclusivamente à relação de locação.
            </li>
            <li>Cumprir obrigações legais, contratuais e fiscais.</li>
            <li>Garantir a segurança e a integridade da plataforma.</li>
          </ul>
          <p>
            <strong>Bases legais (LGPD):</strong> execução de contrato,
            cumprimento de obrigação legal e legítimo interesse na cobrança de
            valores devidos.
          </p>
        </Secao>

        <Secao titulo="4. Mensagens por WhatsApp">
          <p>
            Utilizamos a WhatsApp Business Platform (Meta) para enviar mensagens
            transacionais relacionadas à locação. Não enviamos mensagens de
            marketing sem autorização. O titular pode solicitar a interrupção do
            envio a qualquer momento respondendo à conversa ou entrando em
            contato pelo e-mail acima.
          </p>
        </Secao>

        <Secao titulo="5. Compartilhamento com terceiros">
          <p>
            Compartilhamos dados apenas com operadores necessários à prestação
            do serviço, que os tratam conforme nossas instruções:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Meta Platforms (WhatsApp):</strong> envio de mensagens
              transacionais.
            </li>
            <li>
              <strong>Mercado Pago:</strong> processamento de pagamentos (Pix e
              boleto).
            </li>
            <li>
              <strong>Supabase:</strong> hospedagem e armazenamento seguro dos
              dados da aplicação.
            </li>
          </ul>
          <p>
            Não vendemos dados pessoais. O compartilhamento com autoridades
            ocorre apenas quando exigido por lei.
          </p>
        </Secao>

        <Secao titulo="6. Retenção">
          <p>
            Mantemos os dados pelo tempo necessário às finalidades descritas e
            ao cumprimento de obrigações legais e fiscais. Encerrada a relação e
            os prazos legais, os dados são eliminados ou anonimizados.
          </p>
        </Secao>

        <Secao titulo="7. Direitos do titular">
          <p>
            Nos termos do art. 18 da LGPD, o titular pode solicitar: confirmação
            e acesso aos dados, correção, anonimização, portabilidade,
            eliminação, informação sobre compartilhamentos e revogação de
            consentimento. Basta escrever para{" "}
            <a
              href={`mailto:${CONTROLADOR.email}`}
              className="font-medium text-[#052351] underline"
            >
              {CONTROLADOR.email}
            </a>
            .
          </p>
        </Secao>

        <Secao titulo="8. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados,
            incluindo controle de acesso por usuário, isolamento de dados por
            proprietário (RLS) e comunicação criptografada (HTTPS). Nenhum
            sistema é totalmente imune a riscos, mas trabalhamos continuamente
            para mitigá-los.
          </p>
        </Secao>

        <Secao titulo="9. Alterações desta política">
          <p>
            Podemos atualizar esta Política periodicamente. A data de
            &ldquo;última atualização&rdquo; no topo indica a versão vigente.
            Alterações relevantes serão comunicadas pelos canais apropriados.
          </p>
        </Secao>

        <Secao titulo="10. Contato">
          <p>
            Para exercer direitos ou tirar dúvidas sobre esta Política, entre em
            contato com o {CONTROLADOR.nome} pelo e-mail{" "}
            <a
              href={`mailto:${CONTROLADOR.email}`}
              className="font-medium text-[#052351] underline"
            >
              {CONTROLADOR.email}
            </a>
            .
          </p>
        </Secao>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} {CONTROLADOR.nome}. Todos os direitos
          reservados.
        </footer>
      </div>
    </main>
  );
}
