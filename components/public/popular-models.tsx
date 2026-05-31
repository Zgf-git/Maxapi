import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getPublicCatalogModels } from "@/lib/catalog";
import { getPricingRule } from "@/lib/pricing";
import { formatPricePerMillion } from "@/lib/pricing/display";

export function PopularModels() {
  const models = getPublicCatalogModels().slice(0, 6);

  const modelPricing = models.map((model, index) => {
    const rule = getPricingRule(model.provider, model.upstreamModel);
    return {
      ...model,
      inputPrice: formatPricePerMillion(rule.inputStandardUsdMicrosPerMillion),
      outputPrice: formatPricePerMillion(rule.outputUsdMicrosPerMillion)
    };
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Popular models</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Mainstream models, one consistent access method.</h2>
        </div>
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-cyan-200 hover:text-cyan-100" href="/models">
          View all models
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modelPricing.map((model) => (
          <div key={model.id} className="glass-panel group p-5 transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{model.label}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${model.status === "beta" ? "border border-amber-300/18 bg-amber-300/10 text-amber-200" : "border border-emerald-300/18 bg-emerald-300/10 text-emerald-200"}`}>
                  {model.status}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-slate-400">{model.description}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-white">{model.inputPrice}</span>
                <span className="text-xs text-slate-500">input / 1M</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-slate-200">{model.outputPrice}</span>
                <span className="text-xs text-slate-500">output / 1M</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-300 capitalize">{model.provider}</span>
                {model.supportsStreaming ? <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-300">Streaming</span> : null}
                {model.supportsTools ? <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-300">Tools</span> : null}
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-300">{model.category}</span>
              </div>
          </div>
        ))}
      </div>
    </section>
  );
}
