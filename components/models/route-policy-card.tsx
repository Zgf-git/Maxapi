import Link from "next/link";

import { ProviderLabel } from "@/components/models/model-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isPublicCatalogModel } from "@/lib/catalog";
import type { CatalogPolicyEntry } from "@/lib/catalog/types";

function formatTarget(provider: string | null, model: string | null) {
  if (!provider) {
    return "No fallback configured";
  }

  if (!model) {
    return `${provider} / managed target`;
  }

  return isPublicCatalogModel(model) ? `${provider} / ${model}` : `${provider} / managed fallback`;
}

function formatTargetChain(policy: CatalogPolicyEntry) {
  return policy.targets.map((target) => formatTarget(target.provider, target.model)).join(" -> ");
}

export function RoutePolicyCard({
  policy,
  showDetailLink = true
}: {
  policy: CatalogPolicyEntry;
  showDetailLink?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{policy.label}</CardTitle>
            <CardDescription>route_policy: {policy.id}</CardDescription>
          </div>
          <Badge>{policy.routePolicy}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-[var(--color-muted-foreground)]">{policy.description}</p>
        <div className="grid gap-3 rounded-2xl border p-4">
          <p><span className="font-medium">Default tendency:</span> {formatTarget(policy.defaultProvider, policy.defaultModel)}</p>
          <p><span className="font-medium">Fallback path:</span> {formatTarget(policy.fallbackProvider, policy.fallbackModel)}</p>
          <p><span className="font-medium">Managed chain:</span> {formatTargetChain(policy)}</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(policy.targets.map((target) => target.provider))].map((provider) => (
              <ProviderLabel key={provider} provider={provider} />
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium">Recommended for</p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">{policy.recommendedFor.join(", ")}</p>
        </div>
        <p className="text-[var(--color-muted-foreground)]">
          This is a managed server-side policy, not a fixed provider guarantee. Actual execution can vary because of fallback.
        </p>
        {showDetailLink ? (
          <Link className="inline-flex text-sm font-medium underline-offset-2 hover:underline" href={`/models/${policy.docsSlug}`}>
            View policy details
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
