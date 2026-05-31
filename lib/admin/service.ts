import { PlanTier, RiskState, UserRole } from "@prisma/client";

import { createAuditLog, listRecentAuditLogs } from "@/lib/audit/service";
import { buildPaymentOperationsSummary, getAdminReconciliationData } from "@/lib/admin/reconciliation";
import { listRecentBillingResolutions } from "@/lib/admin/resolutions";
import { listFinalizedUsageEntries, listPendingUsageEntries } from "@/lib/admin/usage";
import { listAdminAnnouncements } from "@/lib/announcements/service";
import { db } from "@/lib/db";
import {
  getPaymentWebhookSummary,
  listRecentPaymentWebhookEvents,
  listRecentTopUpPurchases,
  listStaleTopUpPurchases
} from "@/lib/payments/reconciliation";
import { listPaymentProviderInstances } from "@/lib/payments/provider-instances";
import { listRedemptionCodes } from "@/lib/redemption/service";
import { listRoutePolicyConfigs } from "@/lib/routing/runtime";

export async function getAdminConsoleData() {
  const [users, auditLogs, reconciliation, pendingUsageEntries, finalizedUsageEntries, billingResolutions, paymentProviderInstances, staleTopUpPurchases, recentTopUpPurchases, recentPaymentWebhookEvents, paymentWebhookSummary, routePolicyConfigs, redemptionCodes, announcements, createdCount, checkoutCreatedCount, completedCount, creditedCount, canceledCount, failedCount] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        userBalance: true,
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true
          }
        }
      }
    }),
    listRecentAuditLogs(40),
    getAdminReconciliationData(30),
    listPendingUsageEntries(30),
    listFinalizedUsageEntries(20),
    listRecentBillingResolutions(30),
    listPaymentProviderInstances(),
    listStaleTopUpPurchases(20),
    listRecentTopUpPurchases(20),
    listRecentPaymentWebhookEvents(20),
    getPaymentWebhookSummary(30),
    listRoutePolicyConfigs(),
    listRedemptionCodes(30),
    listAdminAnnouncements(30),
    db.topUpPurchase.count({ where: { status: "CREATED" } }),
    db.topUpPurchase.count({ where: { status: "CHECKOUT_CREATED" } }),
    db.topUpPurchase.count({ where: { status: "COMPLETED" } }),
    db.topUpPurchase.count({ where: { status: "CREDITED" } }),
    db.topUpPurchase.count({ where: { status: "CANCELED" } }),
    db.topUpPurchase.count({ where: { status: "FAILED" } })
  ]);

  return {
    users,
    auditLogs,
    reconciliation,
    pendingUsageEntries,
    finalizedUsageEntries,
    billingResolutions,
    paymentProviderInstances,
    staleTopUpPurchases,
    recentTopUpPurchases,
    recentPaymentWebhookEvents,
    paymentWebhookSummary,
    paymentOperations: buildPaymentOperationsSummary({
      createdCount,
      checkoutCreatedCount,
      completedCount,
      creditedCount,
      canceledCount,
      failedCount
    }),
    routePolicyConfigs,
    redemptionCodes,
    announcements
  };
}

export async function updateUserAdminSettings(input: {
  actorUserId: string;
  targetUserId: string;
  role?: UserRole;
  plan?: PlanTier;
  riskState?: RiskState;
}) {
  const existing = await db.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      role: true,
      plan: true,
      riskState: true
    }
  });

  if (!existing) {
    return { ok: false as const, error: "User not found." };
  }

  const data: { role?: UserRole; plan?: PlanTier; riskState?: RiskState } = {};
  if (input.role) {
    data.role = input.role;
  }
  if (input.plan) {
    data.plan = input.plan;
  }
  if (input.riskState) {
    data.riskState = input.riskState;
  }

  await db.user.update({
    where: { id: input.targetUserId },
    data
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    action: "admin.user.update",
    resourceType: "user",
    resourceId: input.targetUserId,
    metadata: {
      before: existing,
      after: data
    }
  });

  return { ok: true as const };
}
