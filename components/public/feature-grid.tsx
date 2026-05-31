import { BarChart3, Code, Database, RefreshCw, Shield, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: RefreshCw,
    title: "Multi-provider switching",
    description: "Connect different upstream providers behind one entrypoint and adjust routing without changing the client."
  },
  {
    icon: Shield,
    title: "Access and limit control",
    description: "Manage keys, quotas, concurrency, and request limits in one place."
  },
  {
    icon: Database,
    title: "Unified billing",
    description: "Track balances, usage, pending charges, refunds, and manual adjustments from one billing ledger."
  },
  {
    icon: Code,
    title: "OpenAI-compatible API",
    description: "Support chat completions, completions, embeddings, and model discovery with a familiar request format."
  },
  {
    icon: BarChart3,
    title: "Logs and monitoring",
    description: "Review requests, provider status, error trends, and operational events from the same console."
  },
  {
    icon: Zap,
    title: "Admin console",
    description: "Handle users, upstream keys, pricing, and operational actions from a single backend."
  }
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Platform capabilities</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Why teams use MaxAPI.</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="glass-panel p-7 transition hover:-translate-y-0.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/16 bg-cyan-300/10 text-cyan-100">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
