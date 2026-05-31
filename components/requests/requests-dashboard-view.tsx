import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequestFilters } from "@/components/requests/request-filters";
import { RequestsSummary } from "@/components/requests/requests-summary";
import { RequestsTable } from "@/components/requests/requests-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ObservabilityFilters, ObservabilityRow, ObservabilitySummary } from "@/lib/observability/types";

export function RequestsDashboardView({
  rows,
  summary,
  filters
}: {
  rows: ObservabilityRow[];
  summary: ObservabilitySummary;
  filters: ObservabilityFilters;
}) {
  const hasActiveFilters = Boolean(filters.provider || filters.status || filters.routePolicy || filters.fallbackUsed);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Inspect recent routed requests, fallback behavior, and billable outcomes using the platform's existing request logs and usage ledger."
        eyebrow="Operational dashboard"
        title="Request logs"
      />

      <RequestsSummary hasActiveFilters={hasActiveFilters} summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Server-side filters for recent request routing outcomes.</CardDescription>
        </CardHeader>
        <CardContent>
          <RequestFilters filters={filters} />
        </CardContent>
      </Card>

      {summary.requestsLast24h === 0 && rows.length === 0 ? (
        <EmptyState
          actionHref="/dashboard/quickstart"
          actionLabel="Open dashboard quickstart"
          description="No recent traffic has been recorded yet. Create an API key if needed, send a chat completion request, then return here to inspect routing and billing outcomes."
          title="No request activity yet"
        />
      ) : (
        <RequestsTable rows={rows} />
      )}
    </div>
  );
}
