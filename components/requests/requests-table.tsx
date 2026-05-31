import Link from "next/link";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FallbackBadge, ProviderBadge, RequestStatusBadge, RoutePolicyBadge } from "@/components/requests/request-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ObservabilityRow } from "@/lib/observability/types";
import { formatDateTime, formatUsdMicros, formatWholeNumber } from "@/lib/utils";

function formatErrorCell(errorCode: string | null, errorMessage: string | null) {
  if (!errorCode && !errorMessage) {
    return "—";
  }

  if (!errorMessage) {
    return errorCode;
  }

  const shortMessage = errorMessage.length > 64 ? `${errorMessage.slice(0, 61)}...` : errorMessage;

  return errorCode ? `${errorCode}: ${shortMessage}` : shortMessage;
}

export function RequestsTable({ rows }: { rows: ObservabilityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent requests</CardTitle>
        <CardDescription>Latest request logs for this account after filters are applied.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            actionHref="/dashboard/quickstart"
            actionLabel="Open dashboard quickstart"
            description="No request logs match the current filters yet. Make a chat completion call, then come back here to inspect routing and billing outcomes."
            title="No requests found"
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Requested Policy</th>
                <th className="px-3 py-3">Requested Model</th>
                <th className="px-3 py-3">Actual Provider</th>
                <th className="px-3 py-3">Actual Model</th>
                <th className="px-3 py-3">Fallback</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Latency</th>
                <th className="px-3 py-3">Tokens</th>
                <th className="px-3 py-3">Cost</th>
                <th className="px-3 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t align-top" key={row.id}>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link className="font-medium underline-offset-2 hover:underline" href={`/dashboard/requests/${row.id}`}>
                      {formatDateTime(row.createdAt)}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <RoutePolicyBadge routePolicy={row.requestedRoutePolicy} />
                  </td>
                  <td className="px-3 py-3">{row.requestedModel ?? "—"}</td>
                  <td className="px-3 py-3">
                    <ProviderBadge provider={row.actualProvider} />
                  </td>
                  <td className="px-3 py-3">{row.actualUpstreamModel ?? "—"}</td>
                  <td className="px-3 py-3">
                    <FallbackBadge used={row.fallbackUsed} />
                  </td>
                  <td className="px-3 py-3">
                    <RequestStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-3">{row.latencyMs ? `${row.latencyMs} ms` : "—"}</td>
                  <td className="px-3 py-3">{formatWholeNumber(row.totalTokens)}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.totalCostUsdMicros)}</td>
                  <td className="max-w-[260px] px-3 py-3">{formatErrorCell(row.errorCode, row.errorMessage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
