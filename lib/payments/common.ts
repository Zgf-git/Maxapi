import { BalanceTransactionType, PaymentProvider, TopUpPurchaseStatus } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { processReferralCommission } from "@/lib/referral/service";

export function paymentPublicBaseUrl() {
  return env.PAYMENT_PUBLIC_BASE_URL ?? env.APP_BASE_URL;
}

export function usdCentsToCnyFen(usdCents: number) {
  return Math.max(1, Math.round((usdCents / 100) * env.PAYMENT_CNY_RATE * 100));
}

export async function creditTopUpPurchase(input: {
  purchaseId: string;
  providerPaymentId?: string | null;
  providerEventId?: string | null;
  notes: string;
}) {
  const purchase = await db.topUpPurchase.findUnique({
    where: { id: input.purchaseId },
    include: { balanceTransaction: true }
  });

  if (!purchase) {
    return { ok: false as const, error: "Top-up purchase not found." };
  }

  if (purchase.status === TopUpPurchaseStatus.CREDITED && purchase.balanceTransaction) {
    if (input.providerEventId || input.providerPaymentId) {
      await db.topUpPurchase.update({
        where: { id: purchase.id },
        data: {
          providerEventIdLastProcessed: input.providerEventId ?? purchase.providerEventIdLastProcessed,
          providerPaymentId: input.providerPaymentId ?? purchase.providerPaymentId
        }
      });
    }

    return { ok: true as const, credited: false as const };
  }

  await db.$transaction(async (tx) => {
    const currentPurchase = await tx.topUpPurchase.findUnique({
      where: { id: purchase.id },
      include: { balanceTransaction: true }
    });

    if (!currentPurchase) {
      throw new Error("Purchase disappeared before balance credit.");
    }

    if (currentPurchase.status === TopUpPurchaseStatus.CREDITED && currentPurchase.balanceTransaction) {
      return;
    }

    const balance = await getOrCreateUserBalance(currentPurchase.userId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + currentPurchase.creditsUsdMicros;
    const now = new Date();

    await tx.userBalance.update({
      where: { userId: currentPurchase.userId },
      data: { balanceUsdMicros: balanceAfterUsdMicros }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId: currentPurchase.userId,
        type: BalanceTransactionType.CREDIT,
        amountUsdMicros: currentPurchase.creditsUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        topUpPurchaseId: currentPurchase.id,
        reason: `${currentPurchase.paymentProvider.toLowerCase()}_topup:${currentPurchase.packageId}`
      }
    });

    await tx.topUpPurchase.update({
      where: { id: currentPurchase.id },
      data: {
        providerPaymentId: input.providerPaymentId ?? currentPurchase.providerPaymentId,
        providerEventIdLastProcessed: input.providerEventId ?? currentPurchase.providerEventIdLastProcessed,
        status: TopUpPurchaseStatus.CREDITED,
        creditedAt: now,
        notes: input.notes
      }
    });

    await processReferralCommission(
      currentPurchase.userId,
      currentPurchase.creditsUsdMicros,
      transaction.id
    );
  });

  return { ok: true as const, credited: true as const };
}

export async function findProviderPurchaseByOrderId(provider: PaymentProvider, providerOrderId: string) {
  return db.topUpPurchase.findFirst({
    where: {
      paymentProvider: provider,
      providerOrderId
    },
    include: {
      balanceTransaction: true
    }
  });
}

export async function markProviderPurchaseState(input: {
  provider: PaymentProvider;
  providerOrderId: string;
  status: TopUpPurchaseStatus;
  providerEventId?: string | null;
  providerPaymentId?: string | null;
  notes: string;
}) {
  const purchase = await db.topUpPurchase.findFirst({
    where: {
      paymentProvider: input.provider,
      providerOrderId: input.providerOrderId
    }
  });

  if (!purchase || purchase.status === TopUpPurchaseStatus.CREDITED) {
    return { ok: true as const };
  }

  await db.topUpPurchase.update({
    where: { id: purchase.id },
    data: {
      status: input.status,
      providerEventIdLastProcessed: input.providerEventId ?? purchase.providerEventIdLastProcessed,
      providerPaymentId: input.providerPaymentId ?? purchase.providerPaymentId,
      notes: input.notes
    }
  });

  return { ok: true as const };
}
