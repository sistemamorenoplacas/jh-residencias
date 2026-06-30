import type { ChargeStatus } from "@/lib/types";

interface StatusPillProps {
  status: ChargeStatus;
  diasAtraso?: number;
}

const LABELS: Record<ChargeStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const STYLES: Record<ChargeStatus, string> = {
  pago: "bg-pago-tint text-pago",
  pendente: "bg-pendente-tint text-pendente",
  vencido: "bg-vencido-tint text-vencido",
  cancelado: "bg-line text-muted",
};

export function StatusPill({ status, diasAtraso }: StatusPillProps) {
  const showAtraso = status === "vencido" && diasAtraso && diasAtraso > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[status]}
      {showAtraso ? <span className="font-medium opacity-80">+{diasAtraso}d</span> : null}
    </span>
  );
}
