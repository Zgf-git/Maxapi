import Link from "next/link";

import { BalanceTransactionBadge, UsageLedgerStatusBadge } from "@/components/billing/billing-badges";
import { ProviderBadge } from "@/components/requests/request-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingTransactionRow, BillingUsageLedgerRow } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros, formatWholeNumber } from "@/lib/utils";

export function BillingDetailPanel({
  latestTransaction,
  latestLedgerEntry
}: {
  latestTransaction: BillingTransactionRow | null;
  latestLedgerEntry: BillingUsageLedgerRow | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest account billing detail</CardTitle>
        <CardDescription>A compact detail surface for your newest balance movement and newest usage ledger entry.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 text-sm">
          <h3 className="font-semibold">Balance transaction</h3>
          {latestTransaction ? (
            <>
              <p><span className="font-medium">Type:</span> <BalanceTransactionBadge type={latestTransaction.type} /></p>
              <p><span className="font-medium">Amount:</span> {formatUsdMicros(latestTransaction.amountUsdMicros)}</p>
              <p><span className="font-medium">Balance before:</span> {formatUsdMicros(latestTransaction.balanceBeforeUsdMicros)}</p>
              <p><span className="font-medium">Balance after:</span> {formatUsdMicros(latestTransaction.balanceAfterUsdMicros)}</p>
              <p><span className="font-medium">Reason:</span> {latestTransaction.reason}</p>
              <p><span className="font-medium">Created:</span> {formatDateTime(latestTransaction.createdAt)}</p>
            </>
          ) : (
            <p className="text-[var(--color-muted-foreground)]">No balance movement yet.</p>
          )}
        </section>
        <section className="space-y-3 text-sm">
          <h3 className="font-semibold">Usage ledger</h3>
          {latestLedgerEntry ? (
            <>
              <p><span className="font-medium">Status:</span> <UsageLedgerStatusBadge status={latestLedgerEntry.status} /></p>
              <p><span className="font-medium">Provider:</span> <ProviderBadge provider={latestLedgerEntry.provider} /></p>
              <p><span className="font-medium">Actual model:</span> {latestLedgerEntry.upstreamModel ?? "—"}</p>
              <p><span className="font-medium">Prompt tokens:</span> {formatWholeNumber(latestLedgerEntry.promptTokens)}</p>
              <p><span className="font-medium">Completion tokens:</span> {formatWholeNumber(latestLedgerEntry.completionTokens)}</p>
              <p><span className="font-medium">Total cost:</span> {formatUsdMicros(latestLedgerEntry.totalCostUsdMicros)}</p>
              <p><span className="font-medium">Pricing version:</span> {latestLedgerEntry.pricingVersion}</p>
              {latestLedgerEntry.requestLogId ? (
                <Link className="font-medium underline-offset-2 hover:underline" href={`/dashboard/requests/${latestLedgerEntry.requestLogId}`}>
                  Open linked request
                </Link>
              ) : null}
            </>
          ) : (
            <p className="text-[var(--color-muted-foreground)]">No usage charge has been recorded yet.</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
