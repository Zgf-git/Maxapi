import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { getCatalogPolicyEntries, getPublicCatalogModels, isPublicCatalogModel } from "@/lib/catalog";
import { getPublicPlanCatalog } from "@/lib/plans/catalog";
import { getPricingRule } from "@/lib/pricing";
import { formatPricePerMillion } from "@/lib/pricing/display";
import { canShowPublicPricing } from "@/lib/run-mode";

export const metadata: Metadata = {
  title: "Pricing - MaxAPI",
  description:
    "Transparent usage pricing for chat, completions, and embeddings across MaxAPI's OpenAI-compatible gateway."
};

function formatPolicyTarget(provider: string, model: string | null) {
  if (!model) return `${provider} / managed target`;
  if (!isPublicCatalogModel(model)) return `${provider} / managed fallback`;
  return `${provider} / ${model}`;
}

export default function PricingPage() {
  if (!canShowPublicPricing()) {
    notFound();
  }

  const models = getPublicCatalogModels();
  const plans = getPublicPlanCatalog();
  const policies = getCatalogPolicyEntries();

  const modelPricing = models.map((model) => {
    const rule = getPricingRule(model.provider, model.upstreamModel);
    return {
      ...model,
      inputPrice: formatPricePerMillion(rule.inputStandardUsdMicrosPerMillion),
      outputPrice: formatPricePerMillion(rule.outputUsdMicrosPerMillion),
      cacheHitPrice: formatPricePerMillion(rule.inputCacheHitUsdMicrosPerMillion)
    };
  });

  const lowestCacheHit = modelPricing.reduce((min, model) => {
    const value = Number.parseFloat(model.cacheHitPrice.replace("$", ""));
    return Number.isFinite(value) && value < min ? value : min;
  }, Number.POSITIVE_INFINITY);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 lg:px-6">
      <section className="glass-panel overflow-hidden p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,231,196,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(112,164,255,0.22),transparent_42%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Usage Pricing
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Price the gateway honestly, bill from actual usage.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                MaxAPI does not hide cost behind vague bundles. Requests are charged from routed provider usage and recorded in the balance journal plus usage ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-5 py-3 text-sm font-semibold text-slate-950"
                href="/sign-in"
              >
                Launch console
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/docs"
              >
                Billing docs
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              [`$${lowestCacheHit.toFixed(2)}`, "Lowest cache-hit input per 1M tokens"],
              ["Pay as you go", "No subscription needed to start"],
              ["Ledger-backed", "Revenue, cost, and pending usage stay visible"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-[#0b1627]/78 p-5 backdrop-blur-xl">
                <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
                <p className="mt-2 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "How billing works",
            body: "Each request uses the final routed provider and model. Token pricing comes from the matching pricing rule snapshot."
          },
          {
            title: "Streaming edge case",
            body: "If final usage is unavailable, the request can remain pending until operators resolve it or mark it unbillable."
          },
          {
            title: "Route policy pricing",
            body: "Route policies are routing abstractions, not separate SKUs. Billing still follows actual execution."
          }
        ].map((item) => (
          <div key={item.title} className="glass-panel p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="text-2xl font-semibold text-white">Model pricing</h2>
          <p className="mt-2 text-sm text-slate-400">Per-million token rates for the public catalog currently exposed by MaxAPI.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Model</th>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 text-right font-medium">Input / 1M</th>
                <th className="px-6 py-4 text-right font-medium">Output / 1M</th>
                <th className="px-6 py-4 text-right font-medium">Cache hit / 1M</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {modelPricing.map((model) => (
                <tr key={model.id} className="transition hover:bg-white/4">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-white">
                        {model.label.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{model.label}</p>
                        <p className="text-xs text-slate-500">{model.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs font-medium capitalize text-slate-300">
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-medium text-slate-100">{model.inputPrice}</td>
                  <td className="px-6 py-5 text-right font-medium text-slate-100">{model.outputPrice}</td>
                  <td className="px-6 py-5 text-right font-medium text-cyan-200">{model.cacheHitPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Plans</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Plans control access, not hidden bundles.</h2>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-200" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {plans.map((plan) => {
              const isPopular = plan.slug === "builder";
              return (
                <div
                  key={plan.id}
                  className={`rounded-[1.5rem] border p-5 ${isPopular ? "border-cyan-300/24 bg-cyan-300/8" : "border-white/8 bg-white/5"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{plan.label}</p>
                      <p className="mt-1 text-sm text-slate-400">{plan.publicSummary}</p>
                    </div>
                    {isPopular ? (
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-5 space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{plan.allowedModels.length} explicit models</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{plan.allowedRoutePolicies.length} route policies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{plan.playgroundAccess ? "Playground included" : "Playground disabled"}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{plan.supportLabel}</span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-7">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Policy targets</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Current managed route defaults.</h2>
          <div className="mt-5 space-y-3">
            {policies.map((policy) => {
              return (
                <div key={policy.id} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{policy.label}</p>
                    <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs text-slate-300">{policy.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Default: {formatPolicyTarget(policy.defaultProvider, policy.defaultModel)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Fallback: {formatPolicyTarget(policy.fallbackProvider ?? policy.defaultProvider, policy.fallbackModel)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
