import { PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { creditTopUpPurchase } from "@/lib/payments/common";
import { capturePayPalOrderWithConfig } from "@/lib/payments/paypal";
import { getActivePayPalRuntime } from "@/lib/payments/provider-instances";

const STALE_TOP_UP_WINDOW_MINUTES = 60;

export type PaymentWebhookSummary = {
  providerRows: Array<{
    provider: PaymentProvider;
    count: number;
  }>;
  statusRows: Array<{
    status: string;
    count: number;
  }>;
};

function staleWindowStart(now = new Date()) {
  return new Date(now.getTime() - STALE_TOP_UP_WINDOW_MINUTES * 60 * 1000);
}

export async function listStaleTopUpPurchases(limit = 20) {
  return db.topUpPurchase.findMany({
    where: {
      status: {
        in: [TopUpPurchaseStatus.CREATED, TopUpPurchaseStatus.CHECKOUT_CREATED]
      },
      createdAt: {
        lte: staleWindowStart()
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}

export async function listRecentTopUpPurchases(limit = 20) {
  return db.topUpPurchase.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      paymentProviderInstance: true,
      balanceTransaction: true
    }
  });
}

export async function listRecentPaymentWebhookEvents(limit = 20) {
  return db.paymentWebhookEvent.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: limit,
    include: {
      topUpPurchase: {
        select: {
          id: true,
          userId: true,
          paymentProvider: true,
          status: true
        }
      }
    }
  });
}

export async function getPaymentWebhookSummary(windowDays = 30): Promise<PaymentWebhookSummary> {
  const createdAtGte = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [providerRows, statusRows] = await Promise.all([
    db.paymentWebhookEvent.groupBy({
      by: ["provider"],
      where: {
        createdAt: {
          gte: createdAtGte
        }
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          provider: "desc"
        }
      }
    }),
    db.paymentWebhookEvent.groupBy({
      by: ["status"],
      where: {
        createdAt: {
          gte: createdAtGte
        }
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          status: "desc"
        }
      }
    })
  ]);

  return {
    providerRows: providerRows.map((row) => ({
      provider: row.provider,
      count: row._count._all
    })),
    statusRows: statusRows.map((row) => ({
      status: row.status,
      count: row._count._all
    }))
  };
}

async function reconcileStalePayPalPurchase(purchaseId: string) {
  const purchase = await db.topUpPurchase.findUnique({
    where: { id: purchaseId }
  });

  if (
    !purchase ||
    purchase.paymentProvider !== PaymentProvider.PAYPAL ||
    !purchase.providerOrderId ||
    (purchase.status !== TopUpPurchaseStatus.CREATED &&
      purchase.status !== TopUpPurchaseStatus.CHECKOUT_CREATED)
  ) {
    return { ok: true as const, credited: false as const };
  }

  const runtime = await getActivePayPalRuntime();

  if (!runtime) {
    return { ok: true as const, credited: false as const, reason: "paypal_not_configured" };
  }

  try {
    const { response, payload } = await capturePayPalOrderWithConfig(purchase.providerOrderId, runtime.config);

    if (!response.ok || payload?.status !== "COMPLETED") {
      return {
        ok: true as const,
        credited: false as const,
        reason: payload?.status ?? payload?.message ?? "paypal_not_completed"
      };
    }

    const captureId = payload.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const creditResult = await creditTopUpPurchase({
      purchaseId: purchase.id,
      providerPaymentId: captureId,
      notes: "paypal_reconciled_capture"
    });

    return {
      ok: true as const,
      credited: creditResult.ok && creditResult.credited === true
    };
  } catch {
    return { ok: true as const, credited: false as const, reason: "paypal_reconciliation_failed" };
  }
}

export async function reconcileTopUpPurchase(purchaseId: string) {
  const purchase = await db.topUpPurchase.findUnique({
    where: { id: purchaseId },
    include: {
      balanceTransaction: true
    }
  });

  if (!purchase) {
    return { ok: false as const, error: "Top-up purchase not found." };
  }

  if (purchase.status === TopUpPurchaseStatus.CREDITED && purchase.balanceTransaction) {
    return { ok: true as const, credited: false as const, status: purchase.status, reason: "already_credited" };
  }

  if (purchase.paymentProvider !== PaymentProvider.PAYPAL) {
    return {
      ok: true as const,
      credited: false as const,
      status: purchase.status,
      reason: "provider_reconciliation_not_supported"
    };
  }

  const result = await reconcileStalePayPalPurchase(purchaseId);
  return {
    ...result,
    status: purchase.status
  };
}

export async function sweepStaleTopUpPurchases(actorUserId: string) {
  const stalePurchases = await db.topUpPurchase.findMany({
    where: {
      status: {
        in: [TopUpPurchaseStatus.CREATED, TopUpPurchaseStatus.CHECKOUT_CREATED]
      },
      createdAt: {
        lte: staleWindowStart()
      }
    },
    select: {
      id: true
    }
  });

  if (stalePurchases.length === 0) {
    return { ok: true as const, canceledCount: 0, creditedCount: 0 };
  }

  const creditedIds: string[] = [];

  for (const purchase of stalePurchases) {
    const result = await reconcileStalePayPalPurchase(purchase.id);

    if (result.credited) {
      creditedIds.push(purchase.id);
    }
  }

  const staleIds = stalePurchases
    .map((purchase) => purchase.id)
    .filter((id) => !creditedIds.includes(id));

  if (staleIds.length === 0) {
    await createAuditLog({
      actorUserId,
      action: "payment.topup.sweep",
      resourceType: "top_up_purchase",
      metadata: {
        canceledCount: 0,
        creditedCount: creditedIds.length,
        staleIds: [],
        creditedIds
      }
    });

    return { ok: true as const, canceledCount: 0, creditedCount: creditedIds.length };
  }

  const result = await db.topUpPurchase.updateMany({
    where: {
      id: {
        in: staleIds
      },
      status: {
        in: [TopUpPurchaseStatus.CREATED, TopUpPurchaseStatus.CHECKOUT_CREATED]
      }
    },
    data: {
      status: TopUpPurchaseStatus.CANCELED,
      notes: "checkout_expired_by_sweep"
    }
  });

  await createAuditLog({
    actorUserId,
    action: "payment.topup.sweep",
    resourceType: "top_up_purchase",
    metadata: {
      canceledCount: result.count,
      creditedCount: creditedIds.length,
      staleIds,
      creditedIds
    }
  });

  return { ok: true as const, canceledCount: result.count, creditedCount: creditedIds.length };
}
