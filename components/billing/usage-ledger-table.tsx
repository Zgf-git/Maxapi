import Link from "next/link";

import { UsageLedgerStatusBadge } from "@/components/billing/billing-badges";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProviderBadge } from "@/components/requests/request-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingUsageLedgerRow } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros, formatWholeNumber } from "@/lib/utils";

export function UsageLedgerTable({ rows }: { rows: BillingUsageLedgerRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent account usage charges</CardTitle>
        <CardDescription>Your usage ledger entries linked to request logs and debit journal entries when a charge was finalized.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            description="No usage ledger entries exist yet. Successful requests with provider usage metadata will appear here."
            title="No usage ledger entries"
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Actual model</th>
                <th className="px-3 py-3">Request type</th>
                <th className="px-3 py-3">Prompt</th>
                <th className="px-3 py-3">Completion</th>
                <th className="px-3 py-3">Cost</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Request</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t align-top" key={row.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-3">
                    <ProviderBadge provider={row.provider} />
                  </td>
                  <td className="px-3 py-3">{row.upstreamModel ?? "—"}</td>
                  <td className="px-3 py-3">{row.requestLog?.requestType ?? "—"}</td>
                  <td className="px-3 py-3">{formatWholeNumber(row.promptTokens)}</td>
                  <td className="px-3 py-3">{formatWholeNumber(row.completionTokens)}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.totalCostUsdMicros)}</td>
                  <td className="px-3 py-3">
                    <UsageLedgerStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-3">
                    {row.requestLogId ? (
                      <Link className="font-medium underline-offset-2 hover:underline" href={`/dashboard/requests/${row.requestLogId}`}>
                        View request
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
