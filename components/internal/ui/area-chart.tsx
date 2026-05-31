"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function formatDollars(value: number): string {
  if (value === 0) return "$0";
  if (Math.abs(value) < 0.01) return `$${value.toExponential(1)}`;
  return `$${value.toLocaleString("en", { maximumFractionDigits: 2 })}`;
}

type DataPoint = Record<string, number | string>;

type SeriesConfig = {
  key: string;
  label: string;
  color: string;
  fillOpacity?: number;
};

type AreaChartProps = {
  data: DataPoint[];
  series: SeriesConfig[];
  xKey: string;
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  height?: number;
};

const DEFAULT_COLORS = [
  "#5be7c4",
  "#70a4ff",
  "#ff6b6b",
  "#f0e68c",
  "#dda0dd"
];

export function TrendAreaChart({
  data,
  series,
  xKey,
  xFormatter,
  yFormatter,
  height = 320
}: AreaChartProps) {
  const formatY = yFormatter ?? formatDollars;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color || DEFAULT_COLORS[i]} stopOpacity={s.fillOpacity ?? 0.3} />
              <stop offset="95%" stopColor={s.color || DEFAULT_COLORS[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,160,208,0.12)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormatter}
          tick={{ fill: "#8da3c7", fontSize: 11 }}
          axisLine={{ stroke: "rgba(129,160,208,0.18)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fill: "#8da3c7", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(8, 17, 31, 0.92)",
            border: "1px solid rgba(129,160,208,0.18)",
            borderRadius: "12px",
            fontSize: "12px",
            color: "#f4f8ff"
          }}
          formatter={(value) => [formatY(Number(value) || 0), ""]}
          labelFormatter={(label) => String(label)}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#8da3c7", paddingTop: "8px" }}
        />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || DEFAULT_COLORS[i]}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
