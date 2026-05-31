import Link from "next/link";

import { CapabilityBadge, ProviderLabel, StatusBadge } from "@/components/models/model-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalogExplicitModelEntry } from "@/lib/catalog/types";

export function ModelCard({
  model,
  showDetailLink = true
}: {
  model: CatalogExplicitModelEntry;
  showDetailLink?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{model.label}</CardTitle>
            <CardDescription>{model.id}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProviderLabel provider={model.provider} />
            <StatusBadge status={model.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-[var(--color-muted-foreground)]">{model.description}</p>
        <div className="flex flex-wrap gap-2">
          <CapabilityBadge label="Streaming" supported={model.supportsStreaming} />
          <CapabilityBadge label="Tools" supported={model.supportsTools} />
          <CapabilityBadge label="Chat" supported={model.category === "chat"} />
        </div>
        <div>
          <p className="font-medium">Recommended for</p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">{model.recommendedFor.join(", ")}</p>
        </div>
        <p className="text-[var(--color-muted-foreground)]">
          Billing is usage-based from the actual executed provider/model and provider-reported token usage.
        </p>
        {showDetailLink ? (
          <Link className="inline-flex text-sm font-medium underline-offset-2 hover:underline" href={`/models/${model.docsSlug}`}>
            View model details
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
