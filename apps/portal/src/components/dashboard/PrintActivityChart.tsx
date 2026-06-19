"use client";

import { useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type ActivityPoint = {
  date: string;
  label: string;
  cards: number;
  jobs: number;
};

export function PrintActivityChart({ data }: { data: ActivityPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 560;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxCards = Math.max(...data.map((d) => d.cards), 1);

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = pad.top + chartH - (d.cards / maxCards) * chartH;
        return { ...d, x, y, i };
      }),
    [data, chartW, chartH, maxCards, pad.left, pad.top],
  );

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.left} ${pad.top + chartH} L ${points[0]?.x ?? pad.left} ${pad.top + chartH} Z`;

  const active = hover != null ? points[hover] : null;

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Print activity chart">
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + chartH * (1 - pct)}
            y2={pad.top + chartH * (1 - pct)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill="url(#activityFill)" />
        <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === p.i ? 6 : 4}
              fill="#fff"
              stroke="#0d9488"
              strokeWidth="2"
              onMouseEnter={() => setHover(p.i)}
              onMouseLeave={() => setHover(null)}
            />
            <rect
              x={p.x - 20}
              y={pad.top}
              width={40}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHover(p.i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {points.map((p) => (
          <text
            key={`${p.date}-label`}
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {p.label.replace(/^(\w+) (\d+)$/, "$1 $2").split(" ").slice(0, 2).join(" ")}
          </text>
        ))}
        {active ? (
          <g>
            <line
              x1={active.x}
              x2={active.x}
              y1={pad.top}
              y2={pad.top + chartH}
              stroke="#0d9488"
              strokeOpacity="0.35"
            />
            <rect
              x={active.x - 44}
              y={active.y - 36}
              width={88}
              height={28}
              rx={6}
              fill="#0f172a"
            />
            <text x={active.x} y={active.y - 18} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="600">
              {active.cards} cards
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
