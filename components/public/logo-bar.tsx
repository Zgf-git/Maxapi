"use client";

import { Database, RefreshCw, Shield, Zap } from "lucide-react";

const FEATURES = [
  { icon: RefreshCw, label: "Multi-provider registry" },
  { icon: Shield, label: "Per-key risk controls" },
  { icon: Database, label: "Usage and billing ledger" },
  { icon: Zap, label: "Streaming failover path" }
];

export function LogoBar() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
      <div className="glass-panel p-5 sm:p-6">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Reliability primitives
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-300"
            >
              <feature.icon className="h-4 w-4 text-cyan-200" />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
