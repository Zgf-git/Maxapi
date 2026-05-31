import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listApiKeys } from "@/lib/api-keys/service";
import { ApiKeysTable } from "@/components/dashboard/api-keys-table";
import { OnboardingStatusCard } from "@/components/onboarding/onboarding-status-card";
import { getOnboardingState } from "@/lib/onboarding/service";
import { getBillingPageData } from "@/lib/billing/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { canUseBilling } from "@/lib/run-mode";
import { formatUsdMicros } from "@/lib/utils";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [apiKeys, onboardingState, billingData, requestCount] = await Promise.all([
    listApiKeys(user.id),
    getOnboardingState(user.id),
    getBillingPageData(user.id),
    db.requestLog.count({ where: { userId: user.id } })
  ]);

  const summary = billingData.summary;
  const showBilling = canUseBilling();

  return (
    <div className="space-y-6">
      <OnboardingStatusCard state={onboardingState} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My balance"
          value={formatUsdMicros(billingData.balance.balanceUsdMicros)}
          description="Available for your API requests"
          variant="emerald"
        />
        <StatCard
          label="My spend last 24h"
          value={formatUsdMicros(summary.spendLast24hUsdMicros)}
          description="Recent account usage"
          variant="amber"
        />
        <StatCard
          label="Total requests"
          value={String(requestCount)}
          description="All time API calls"
          variant="default"
        />
        <StatCard
          label="API keys"
          value={String(apiKeys.length)}
          description={`${apiKeys.filter((k) => k.status === "ACTIVE").length} active`}
          variant="default"
        />
      </div>

      <div className="glass-panel overflow-hidden p-6 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,231,196,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(112,164,255,0.14),transparent_42%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Developer workspace</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Developer console overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Manage your own API keys, prepaid balance, request logs, model access, and playground runs. Internal seller tools live separately under Internal Admin and Internal Ops when your role allows them.
          </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-5 py-2.5 text-sm font-medium text-slate-950"
            href="/dashboard/api-keys"
          >
            API Keys
          </Link>
          <Link
            className="rounded-full border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            href="/dashboard/requests"
          >
            Requests
          </Link>
          {showBilling ? (
            <Link
              className="rounded-full border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              href="/dashboard/billing"
            >
              My Billing
            </Link>
          ) : null}
          <Link
            className="rounded-full border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            href="/dashboard/playground"
          >
            Playground
          </Link>
        </div>
        </div>
      </div>

      <ApiKeysTable items={apiKeys} />
    </div>
  );
}
