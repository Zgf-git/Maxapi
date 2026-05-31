import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Delta = {
  value: string;
  direction: "up" | "down" | "flat";
  label?: string;
};

type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: Delta;
  icon?: ReactNode;
  className?: string;
};

const DELTA_STYLES: Record<Delta["direction"], string> = {
  up: "text-emerald-300",
  down: "text-rose-300",
  flat: "text-slate-400"
};

const DELTA_GLYPH: Record<Delta["direction"], string> = {
  up: "▲",
  down: "▼",
  flat: "•"
};

export function MetricCard({ label, value, hint, delta, icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "glass-panel flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/4 p-4",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
        <span>{label}</span>
        {icon ? <span className="text-slate-500">{icon}</span> : null}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        {delta ? (
          <span className={cn("font-medium tabular-nums", DELTA_STYLES[delta.direction])}>
            {DELTA_GLYPH[delta.direction]} {delta.value}
            {delta.label ? <span className="ml-1 text-slate-500">{delta.label}</span> : null}
          </span>
        ) : (
          <span aria-hidden />
        )}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

export function MetricGrid({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
