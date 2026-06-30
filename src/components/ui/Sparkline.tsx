interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}

/** Sparkline SVG sem dependências. Normaliza a série no próprio viewBox. */
export function Sparkline({ data, className, width = 96, height = 32 }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${width},${height} 0,${height}`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline
        points={line}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
