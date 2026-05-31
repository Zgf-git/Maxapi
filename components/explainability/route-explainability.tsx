import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteExplainability({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How routing is explained</CardTitle>
        <CardDescription>What changes between explicit models, route policies, fallback, logs, and billing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <p className="font-medium">Explicit model requests</p>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            When you send `model`, the platform attempts to execute that supported public model directly.
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="font-medium">route_policy requests</p>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            When you send `route_policy`, the platform chooses a provider/model using server-side routing rules.
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="font-medium">Fallback behavior</p>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            On selected retryable upstream failures, the platform may retry once on a configured fallback path.
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="font-medium">Observability</p>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Request history records requested intent separately from actual provider/model and whether fallback was used.
          </p>
          {dashboard ? (
            <Link className="mt-3 inline-flex font-medium underline-offset-2 hover:underline" href="/dashboard/requests">
              Open request history
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
