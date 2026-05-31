import { BalanceOverview } from "@/components/billing/balance-overview";
import { BillingDetailPanel } from "@/components/billing/billing-detail-panel";
import { BillingResolutionsTable } from "@/components/billing/billing-resolutions-table";
import { BillingSummary } from "@/components/billing/billing-summary";
import { type PublicPaymentProvider } from "@/lib/payments/providers";
import { TopUpPurchasesTable } from "@/components/billing/top-up-purchases-table";
import { TopUpCard } from "@/components/billing/top-up-card";
import { TransactionsTable } from "@/components/billing/transactions-table";
import { UsageLedgerTable } from "@/components/billing/usage-ledger-table";
import { PageHeader } from "@/components/dashboard/page-header";
import type {
  BillingResolutionRow,
  BillingTopUpPurchaseRow,
  BillingTransactionRow,
  BillingUsageLedgerRow,
  BillingSummary as BillingSummaryData
} from "@/lib/billing/dashboard";
import type { TopUpPackage } from "@/lib/payments/topup-packages";

export function BillingDashboardView({
  balanceUsdMicros,
  minimumRequestBalanceUsdMicros,
  canGrantDeveloperCredit,
  developerCreditUsdMicros,
  paymentProviders,
  topUpPackages,
  summary,
  transactions,
  usageLedgerEntries,
  topUpPurchases,
  billingResolutions
}: {
  balanceUsdMicros: bigint;
  minimumRequestBalanceUsdMicros: bigint;
  canGrantDeveloperCredit: boolean;
  developerCreditUsdMicros: bigint;
  paymentProviders: PublicPaymentProvider[];
  topUpPackages: TopUpPackage[];
  summary: BillingSummaryData;
  transactions: BillingTransactionRow[];
  usageLedgerEntries: BillingUsageLedgerRow[];
  topUpPurchases: BillingTopUpPurchaseRow[];
  billingResolutions: BillingResolutionRow[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Review your own prepaid balance, top-ups, request charges, and account-level billing corrections. Platform revenue, provider costs, and other users stay in Internal Ops/Admin."
        eyebrow="My Billing"
        title="My balance and usage ledger"
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <BalanceOverview balanceUsdMicros={balanceUsdMicros} minimumRequestBalanceUsdMicros={minimumRequestBalanceUsdMicros} />
        <TopUpCard
          canGrantDeveloperCredit={canGrantDeveloperCredit}
          developerCreditUsdMicros={developerCreditUsdMicros}
          paymentProviders={paymentProviders}
          topUpPackages={topUpPackages}
        />
      </div>

      <BillingSummary summary={summary} />

      <BillingDetailPanel latestLedgerEntry={usageLedgerEntries[0] ?? null} latestTransaction={transactions[0] ?? null} />

      <TransactionsTable rows={transactions} />

      <TopUpPurchasesTable rows={topUpPurchases} />

      <BillingResolutionsTable rows={billingResolutions} />

      <UsageLedgerTable rows={usageLedgerEntries} />
    </div>
  );
}
