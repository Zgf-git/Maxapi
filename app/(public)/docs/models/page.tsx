import type { Metadata } from "next";

import { getPublicCatalogModels } from "@/lib/catalog";
import { getPricingRule } from "@/lib/pricing";
import { formatPricePerMillion } from "@/lib/pricing/display";

export const metadata: Metadata = {
  title: "Supported Models - MaxAPI",
  description: "Browse MaxAPI's public models with category, provider, status, and token pricing."
};

export default function ModelsPage() {
  const models = getPublicCatalogModels();

  const modelPricing = models.map((model) => {
    const rule = getPricingRule(model.provider, model.upstreamModel);
    return {
      ...model,
      inputPrice: formatPricePerMillion(rule.inputStandardUsdMicrosPerMillion),
      outputPrice: formatPricePerMillion(rule.outputUsdMicrosPerMillion),
      cacheHitPrice: formatPricePerMillion(rule.inputCacheHitUsdMicrosPerMillion)
    };
  });

  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Supported models</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Public model ids, providers, and pricing snapshots currently exposed through the MaxAPI gateway.
        </p>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Model ID</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Input / 1M</th>
                <th className="px-6 py-4 text-right font-medium">Output / 1M</th>
                <th className="px-6 py-4 text-right font-medium">Cache hit / 1M</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {modelPricing.map((model) => (
                <tr key={model.id} className="transition hover:bg-white/4">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-cyan-200">{model.id}</td>
                  <td className="px-6 py-4 font-medium text-white">{model.label}</td>
                  <td className="px-6 py-4 text-slate-400">{model.category}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs font-medium capitalize text-slate-300">
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        model.status === "active"
                          ? "border border-emerald-300/18 bg-emerald-300/10 text-emerald-200"
                          : model.status === "beta"
                            ? "border border-amber-300/18 bg-amber-300/10 text-amber-200"
                            : "border border-white/10 bg-white/6 text-slate-300"
                      }`}
                    >
                      {model.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-100">{model.inputPrice}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-100">{model.outputPrice}</td>
                  <td className="px-6 py-4 text-right font-medium text-cyan-200">{model.cacheHitPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
