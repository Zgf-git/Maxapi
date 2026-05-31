import { StatCard } from "@/components/dashboard/stat-card";
import type { BillingSummary as BillingSummaryData } from "@/lib/billing/dashboard";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export function BillingSummary({ summary }: { summary: BillingSummaryData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        description="Your account's debit total from the balance journal."
        label="Spend last 24h"
        value={formatUsdMicros(summary.spendLast24hUsdMicros)}
      />
      <StatCard
        description="Your account's debit total from the last seven days."
        label="Spend last 7d"
        value={formatUsdMicros(summary.spendLast7dUsdMicros)}
      />
      <StatCard
        description="Your credits and positive adjustments from the last 30 days."
        label="Credits last 30d"
        value={formatUsdMicros(summary.creditsLast30dUsdMicros)}
      />
      <StatCard
        description="Most recent debit journal entry for this account."
        label="Last charge"
        value={summary.lastChargeAt ? formatDateTime(summary.lastChargeAt) : "—"}
      />
    </section>
  );
}
