import Link from "next/link";

import { BalanceTransactionBadge } from "@/components/billing/billing-badges";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingTransactionRow } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

function formatSignedAmount(row: BillingTransactionRow) {
  if (row.amountUsdMicros < 0n) {
    return formatUsdMicros(row.amountUsdMicros);
  }

  const sign = row.type === "DEBIT" ? "-" : "+";

  return `${sign}${formatUsdMicros(row.amountUsdMicros)}`;
}

function formatReason(reason: string) {
  if (reason.includes("topup")) {
    return "Balance top-up";
  }

  if (reason === "developer_credit") {
    return "Developer credit";
  }

  return reason.replaceAll("_", " ");
}

function formatReference(row: BillingTransactionRow) {
  if (row.usageLedgerEntry?.requestLogId) {
    return (
      <Link className="font-medium underline-offset-2 hover:underline" href={`/dashboard/requests/${row.usageLedgerEntry.requestLogId}`}>
        View request
      </Link>
    );
  }

  if (row.topUpPurchase) {
    return `${row.topUpPurchase.packageId} · ${row.topUpPurchase.status.toLowerCase()}`;
  }

  return "—";
}

export function TransactionsTable({ rows }: { rows: BillingTransactionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent account transactions</CardTitle>
        <CardDescription>Auditable balance-affecting journal entries for your credits, debits, and adjustments.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState
            description="No balance transactions exist yet. Add developer credit locally or send a successful billable request after credit is available."
            title="No transactions yet"
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Balance after</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t align-top" key={row.id}>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-3">
                    <BalanceTransactionBadge type={row.type} />
                  </td>
                  <td className="px-3 py-3 font-medium">{formatSignedAmount(row)}</td>
                  <td className="px-3 py-3">{formatUsdMicros(row.balanceAfterUsdMicros)}</td>
                  <td className="px-3 py-3 capitalize">{formatReason(row.reason)}</td>
                  <td className="px-3 py-3">{formatReference(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
