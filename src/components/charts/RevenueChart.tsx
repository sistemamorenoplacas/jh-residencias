interface Serie {
  name: string;
  /** Cor da linha (hex ou var). */
  color: string;
  data: number[];
}

interface RevenueChartProps {
  series: Serie[];
  labels: string[];
  /** Sufixo do eixo Y (ex.: "%"). */
  unit?: string;
}

const W = 560;
const H = 240;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 20;
const PAD_B = 32;

function pathFrom(data: number[], max: number): string {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  return data
    .map((v, i) => {
      const x = PAD_L + i * step;
      const y = PAD_T + innerH - (max === 0 ? 0 : (v / max) * innerH);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Gráfico de linhas sem dependências (SVG). Duas séries sobre os últimos
 * meses, com grade suave e eixos rotulados. Componente puro (server-safe).
 */
export function RevenueChart({ series, labels, unit = "" }: RevenueChartProps) {
  const allValues = series.flatMap((s) => s.data);
  const rawMax = Math.max(1, ...allValues);
  const max = Math.ceil(rawMax / 20) * 20 || 20;
  const ticks = [0, max / 2, max];
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const step = labels.length > 1 ? innerW / (labels.length - 1) : 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Evolução mensal"
    >
      {ticks.map((t) => {
        const y = PAD_T + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-faint"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {Math.round(t)}
              {unit}
            </text>
          </g>
        );
      })}

      {series.map((s) => (
        <path
          key={s.name}
          d={pathFrom(s.data, max)}
          fill="none"
          stroke={s.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {series.map((s) => {
        const last = s.data.length - 1;
        const x = PAD_L + last * step;
        const y =
          PAD_T + innerH - (max === 0 ? 0 : (s.data[last] / max) * innerH);
        return (
          <circle key={`${s.name}-dot`} cx={x} cy={y} r={3.5} fill={s.color} />
        );
      })}

      {labels.map((lab, i) => (
        <text
          key={lab + i}
          x={PAD_L + i * step}
          y={H - 10}
          textAnchor="middle"
          className="fill-faint"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {lab}
        </text>
      ))}
    </svg>
  );
}
