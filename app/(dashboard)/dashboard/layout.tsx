import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPlanName } from "@/lib/plans/catalog";
import { canUseBilling, canUseReferral } from "@/lib/run-mode";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { plan: true }
  });

  return (
    <DashboardShell
      showBilling={canUseBilling()}
      showReferral={canUseReferral()}
      planLabel={formatPlanName(account?.plan)}
      userEmail={user.email}
    >
      {children}
    </DashboardShell>
  );
}
