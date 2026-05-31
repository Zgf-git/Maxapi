import { notFound } from "next/navigation";
import { BillingDashboardView } from "@/components/billing/billing-dashboard-view";
import { requirePageUser } from "@/lib/auth/session";
import { getBillingPageData } from "@/lib/billing/dashboard";
import { canUseBilling } from "@/lib/run-mode";

export default async function BillingPage() {
  if (!canUseBilling()) {
    notFound();
  }

  const user = await requirePageUser();
  const data = await getBillingPageData(user.id);

  return (
    <BillingDashboardView
      balanceUsdMicros={data.balance.balanceUsdMicros}
      canGrantDeveloperCredit={data.canGrantDeveloperCredit}
      developerCreditUsdMicros={data.developerCreditUsdMicros}
      minimumRequestBalanceUsdMicros={data.minimumRequestBalanceUsdMicros}
      paymentProviders={data.paymentProviders}
      summary={data.summary}
      topUpPackages={data.topUpPackages}
      transactions={data.transactions}
      topUpPurchases={data.topUpPurchases}
      billingResolutions={data.billingResolutions}
      usageLedgerEntries={data.usageLedgerEntries}
    />
  );
}
