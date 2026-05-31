import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AnimatedSection } from "@/components/public/animated-section";
import { getCatalogPolicyEntries, getPublicCatalogModels } from "@/lib/catalog";
import { RoutePolicyCard } from "@/components/models/route-policy-card";
import { ModelCard } from "@/components/models/model-card";

export const metadata: Metadata = {
  title: "Models - MaxAPI",
  description:
    "Browse MaxAPI's supported public models and managed route policies across OpenAI-compatible upstream providers."
};

export default function ModelsPage() {
  const policies = getCatalogPolicyEntries();
  const models = getPublicCatalogModels();
  const featuredModels = models.slice(0, 2);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 lg:px-6">
      <AnimatedSection className="glass-panel overflow-hidden p-8 text-center sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(91,231,196,0.16),transparent_32%),radial-gradient(circle_at_bottom_center,rgba(112,164,255,0.18),transparent_42%)]" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">Models</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Supported models and route policies
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Use explicit model ids when you need control, or route policies when you want MaxAPI to manage provider choice and fallback.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-5 py-2.5 text-sm font-semibold text-slate-950"
              href="/docs/quickstart"
            >
              Try quickstart
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/pricing"
            >
              View pricing
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnimatedSection delay={100}>
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white">Explicit model</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use <code className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-xs text-slate-200">model</code> when you want one supported public model id such as <code className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-xs text-slate-200">{featuredModels[0]?.id ?? "gpt-5.4"}</code> or <code className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-xs text-slate-200">{featuredModels[1]?.id ?? "gpt-4o-mini"}</code>.
            </p>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white">Route policy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use <code className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-xs text-slate-200">route_policy</code> when you want MaxAPI to manage the target chain for {policies.map((policy) => policy.routePolicy).join(", ")} routing.
            </p>
          </div>
        </AnimatedSection>
      </div>

      <div>
        <AnimatedSection>
          <h2 className="mb-6 text-2xl font-semibold text-white">Route policies</h2>
        </AnimatedSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {policies.map((policy, i) => (
            <AnimatedSection key={policy.id} delay={i * 80}>
              <RoutePolicyCard policy={policy} />
            </AnimatedSection>
          ))}
        </div>
      </div>

      <div>
        <AnimatedSection>
          <h2 className="mb-6 text-2xl font-semibold text-white">Explicit models</h2>
        </AnimatedSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model, i) => (
            <AnimatedSection key={model.id} delay={i * 80}>
              <ModelCard model={model} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
}
