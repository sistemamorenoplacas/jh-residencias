/** Selo discreto: o inquilino abriu o link de pagamento (n vezes). */
export function LinkAbertoBadge({ aberturas }: { aberturas?: number }) {
  if (!aberturas) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand"
      title={`Abriu o link de pagamento ${aberturas} vez${aberturas === 1 ? "" : "es"}`}
    >
      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      Abriu{aberturas > 1 ? ` ${aberturas}×` : ""}
    </span>
  );
}
