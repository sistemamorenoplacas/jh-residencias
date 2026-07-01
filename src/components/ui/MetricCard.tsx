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
  /** "hero" = painel dominante com número-herói em serifa e grelha de blueprint. */
  variant?: "default" | "hero";
  /** Índice editorial (ex.: "01") exibido como marcador de seção. */
  index?: string;
}

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function MetricCard({
  label,
  value,
  icon,
  tone = "text-brand",
  spark,
  progress,
  hint,
  variant = "default",
  index,
}: MetricCardProps) {
  if (variant === "hero") {
    return (
      <div className="card-surface blueprint rise relative overflow-hidden p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="kicker">{label}</p>
          <div className={`flex size-10 items-center justify-center rounded-xl bg-current/10 ${tone}`}>
            {icon}
          </div>
        </div>

        <p className="num-hero mt-7 text-[3.25rem] text-ink sm:text-[4rem] lg:text-[5rem]">
          {value}
        </p>

        {progress !== undefined ? (
          <div className="mt-6 max-w-md">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-faint">
                {hint ?? "Progresso"}
              </span>
              <span className="tnum text-ink">{clampPct(progress)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-line-strong">
              <div
                className={`h-full rounded-pill bg-current ${tone}`}
                style={{ width: `${clampPct(progress)}%` }}
              />
            </div>
          </div>
        ) : hint ? (
          <p className="mt-4 text-sm text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card-surface rise p-5">
      <div className="flex items-start justify-between">
        <div className={`flex size-9 items-center justify-center rounded-xl bg-current/10 ${tone}`}>
          {icon}
        </div>
        {index ? (
          <span className="section-index">{index}</span>
        ) : spark ? (
          <div className={tone}>
            <Sparkline data={spark} />
          </div>
        ) : null}
      </div>

      <p className="kicker mt-5">{label}</p>
      <p className="serif mt-1.5 text-[1.9rem] leading-none text-ink">{value}</p>

      {progress !== undefined ? (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-line-strong">
            <div
              className={`h-full rounded-pill bg-current ${tone}`}
              style={{ width: `${clampPct(progress)}%` }}
            />
          </div>
          {hint ? <p className="mt-2 text-xs text-faint">{hint}</p> : null}
        </div>
      ) : hint ? (
        <p className="mt-2.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
