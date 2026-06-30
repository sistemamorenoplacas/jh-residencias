import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  /** Cor do chip do ícone e do sparkline (classe de cor Tailwind, ex.: "text-brand"). */
  tone?: string;
  spark?: number[];
  /** Quando definido, mostra barra de progresso em vez de sparkline. */
  progress?: number; // 0..100
  hint?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  tone = "text-brand",
  spark,
  progress,
  hint,
}: MetricCardProps) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between">
        <div className={`flex size-9 items-center justify-center rounded-xl bg-current/10 ${tone}`}>
          {icon}
        </div>
        {spark ? <div className={tone}><Sparkline data={spark} /></div> : null}
      </div>

      <p className="mt-4 text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tnum">{value}</p>

      {progress !== undefined ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-line">
            <div
              className={`h-full rounded-pill bg-current ${tone}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {hint ? <p className="mt-1.5 text-xs text-faint">{hint}</p> : null}
        </div>
      ) : hint ? (
        <p className="mt-2 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
