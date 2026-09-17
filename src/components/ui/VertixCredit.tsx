/** Crédito "Desenvolvido por Vertix" — rodapé do painel e páginas de pagamento. */
export function VertixCredit({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://vertix.studio"
      target="_blank"
      rel="noopener noreferrer"
      className={`vertix-credit ${className}`.trim()}
    >
      Desenvolvido por <strong>Vertix</strong>
    </a>
  );
}
