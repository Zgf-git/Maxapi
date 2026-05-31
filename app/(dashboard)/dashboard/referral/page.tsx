import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getReferralStats } from "@/lib/referral/queries";
import { ReferralDashboard } from "@/components/referral/referral-dashboard";
import { canUseReferral } from "@/lib/run-mode";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Referral"
};

export default async function ReferralPage() {
  if (!canUseReferral()) {
    notFound();
  }

  const user = await requirePageUser();
  const stats = await getReferralStats(user.id);

  if (
    !stats?.code ||
    typeof stats.rate !== "number" ||
    typeof stats.referralCount !== "number" ||
    stats.totalCommissionUsdMicros === null ||
    stats.totalCommissionUsdMicros === undefined
  ) {
    redirect("/dashboard");
  }

  return (
    <ReferralDashboard
      baseUrl={env.APP_BASE_URL}
      stats={{
        code: stats.code,
        rate: stats.rate,
        totalCommissionUsdMicros: BigInt(stats.totalCommissionUsdMicros),
        referralCount: stats.referralCount
      }}
    />
  );
}
