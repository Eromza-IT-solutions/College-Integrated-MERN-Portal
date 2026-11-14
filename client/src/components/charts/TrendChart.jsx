import { useId } from "react";

export default function TrendChart({
  labels,
  values,
  color = "#a9233d",
  height = 220,
  ariaLabel = "Trend chart",
}) {
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const width = 560;
  const paddingX = 28;
  const paddingY = 24;
  const max = Math.max(...values, 1) * 1.15;
  const denominator = Math.max(values.length - 1, 1);

  const points = values.map((value, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / denominator;
    const y = height - paddingY - (value / max) * (height - paddingY * 2);
    return { x, y, value };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${paddingX},${height - paddingY} ${line} ${width - paddingX},${height - paddingY}`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((lineIndex) => {
          const y = paddingY + (lineIndex * (height - paddingY * 2)) / 3;
          return (
            <line
              key={lineIndex}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="#e5e9f0"
              strokeDasharray="4 4"
            />
          );
        })}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#ffffff"
            stroke={color}
            strokeWidth="2"
          />
        ))}
      </svg>

      <div
        className="mt-2 grid text-center text-[11px] text-eromza-subtle"
        style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
