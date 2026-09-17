const VIOLETA_VERTIX = "#6C5BF2";

interface VertixCreditProps {
  /** Padding do contêiner (o padrão dá respiro de rodapé). */
  className?: string;
  /** `dark` para fundos navy (login); `light` para o painel e páginas claras. */
  tone?: "light" | "dark";
}

/**
 * Crédito de autoria "Desenvolvido por VERTIX" — mesmo desenho usado nos
 * outros sistemas da Vertix: marca inline (dois traçados, sem requisição
 * extra) + wordmark com o "I" violeta.
 *
 * O violeta é fixo (identidade da Vertix); o chevron interno herda
 * `currentColor` para aparecer tanto no tema claro quanto no navy do login.
 */
export function VertixCredit({ className = "py-6", tone = "light" }: VertixCreditProps) {
  const dark = tone === "dark";
  return (
    <div className={`flex justify-center ${className}`}>
      <a
        href="https://vertix.studio"
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
          dark
            ? "text-white/60 hover:bg-white/10 hover:text-white"
            : "text-muted hover:bg-brand-tint hover:text-ink"
        }`}
      >
        <span>Desenvolvido por</span>

        <svg
          viewBox="71 67 146 162"
          className="h-4 w-auto shrink-0"
          role="img"
          aria-label="Vertix"
        >
          <g transform="translate(78,66)">
            <path
              d="M6 132 L66 14 L126 132"
              fill="none"
              stroke={VIOLETA_VERTIX}
              strokeWidth={26}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M34 150 L66 88 L98 150"
              fill="none"
              stroke="currentColor"
              strokeWidth={20}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          </g>
        </svg>

        <span
          className={`font-bold tracking-wide transition-colors ${
            dark ? "text-white/90 group-hover:text-white" : "text-ink group-hover:text-brand-dark"
          }`}
        >
          VERT<span style={{ color: VIOLETA_VERTIX }}>I</span>X
        </span>
      </a>
    </div>
  );
}
