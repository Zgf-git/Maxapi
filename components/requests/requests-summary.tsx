import { StatCard } from "@/components/dashboard/stat-card";
import type { ObservabilitySummary } from "@/lib/observability/types";
import { formatUsdMicros } from "@/lib/utils";

export function RequestsSummary({
  summary,
  hasActiveFilters
}: {
  summary: ObservabilitySummary;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {hasActiveFilters
          ? "Summary cards reflect the same active table filters across the full last-24-hour dataset."
          : "Summary cards reflect full-account activity from the last 24 hours."}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Requests (24h)"
          value={summary.requestsLast24h.toLocaleString()}
          description="Recent routed requests observed in the last 24 hours."
        />
        <StatCard
          label="Success rate"
          value={`${(summary.successRate * 100).toFixed(1)}%`}
          description="Successful requests in the last 24 hours."
        />
        <StatCard
          label="Fallback rate"
          value={`${(summary.fallbackRate * 100).toFixed(1)}%`}
          description="Requests that needed a retryable fallback target."
        />
        <StatCard
          label="Total spend"
          value={formatUsdMicros(summary.totalSpendUsdMicros)}
          description="Billable usage recorded in the last 24 hours."
        />
        <StatCard
          label="Top provider"
          value={summary.topProvider ? summary.topProvider.provider : "—"}
          description={
            summary.topProvider
              ? `${formatUsdMicros(summary.topProvider.totalSpendUsdMicros)} in billable usage.`
              : "No billable traffic recorded yet."
          }
        />
      </div>
    </div>
  );
}
