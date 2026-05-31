import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CostExplainability } from "@/components/explainability/cost-explainability";
import { CapabilityBadge, ProviderLabel, StatusBadge } from "@/components/models/model-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicCatalogEntryBySlug, getPublicCatalogSlugs, isPublicCatalogModel } from "@/lib/catalog";

function formatPolicyTarget(provider: string | null, model: string | null) {
  if (!provider) {
    return "No fallback";
  }

  if (!model) {
    return `${provider} / managed target`;
  }

  return isPublicCatalogModel(model) ? `${provider} / ${model}` : `${provider} / managed fallback`;
}

export function generateStaticParams() {
  return getPublicCatalogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getPublicCatalogEntryBySlug(slug);
  if (!entry) {
    return { title: "Not Found - MaxAPI" };
  }
  return {
    title: `${entry.label} - MaxAPI`,
    description: entry.description
  };
}

export default async function ModelDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getPublicCatalogEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 lg:px-6">
      <section className="space-y-4 rounded-[2rem] border bg-white/75 p-8 shadow-sm">
        <Link className="text-sm font-medium underline-offset-2 hover:underline" href="/models">
          Back to models
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
          {entry.kind === "model" ? "Explicit model" : "Route policy"}
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">{entry.label}</h1>
        <p className="max-w-3xl text-base text-[var(--color-muted-foreground)]">{entry.description}</p>
      </section>

      {entry.kind === "model" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle>Model details</CardTitle>
              <CardDescription>Public model metadata from the catalog.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p><span className="font-medium">Public model id:</span> {entry.id}</p>
              <p><span className="font-medium">Provider:</span> <ProviderLabel provider={entry.provider} /></p>
              <p><span className="font-medium">Upstream model:</span> {entry.upstreamModel}</p>
              <p><span className="font-medium">Category:</span> {entry.category}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={entry.status} />
                <CapabilityBadge label="Streaming" supported={entry.supportsStreaming} />
                <CapabilityBadge label="Tools" supported={entry.supportsTools} />
              </div>
              <div>
                <p className="font-medium">Recommended for</p>
                <p className="mt-1 text-[var(--color-muted-foreground)]">{entry.recommendedFor.join(", ")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>How to request it</CardTitle>
              <CardDescription>Use this id in the OpenAI-compatible chat completions body.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
              <p><span>Send </span><code>model: "{entry.id}"</code><span> to request this explicit model.</span></p>
              <p>When supported, MaxAPI attempts to execute this model directly rather than choosing by route policy.</p>
              <p>Billing still uses actual provider-reported usage and the actual executed provider/model path.</p>
              <Link className="inline-flex font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline" href="/docs/quickstart">
                Open quickstart
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle>Policy details</CardTitle>
              <CardDescription>Managed route policy metadata from the catalog.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p><span className="font-medium">Request field:</span> <code>route_policy: "{entry.routePolicy}"</code></p>
              <p><span className="font-medium">Default tendency:</span> {formatPolicyTarget(entry.defaultProvider, entry.defaultModel)}</p>
              <p><span className="font-medium">Fallback:</span> {formatPolicyTarget(entry.fallbackProvider, entry.fallbackModel)}</p>
              <div>
                <p className="font-medium">Recommended for</p>
                <p className="mt-1 text-[var(--color-muted-foreground)]">{entry.recommendedFor.join(", ")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>What this policy means</CardTitle>
              <CardDescription>Route policies are managed server-side abstractions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
              <p>This policy expresses routing intent, not a guaranteed fixed provider.</p>
              <p>Actual provider/model may vary if fallback is used after a retryable upstream failure.</p>
              <p>Request logs show requested policy, actual provider/model, and whether fallback was used.</p>
              <p>Billing uses the actual executed provider/model and token usage, not the policy name alone.</p>
            </CardContent>
          </Card>
        </section>
      )}

      <CostExplainability />
    </main>
  );
}
