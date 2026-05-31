import { TopUpPurchaseStatus, type BillingResolutionType } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/service";
import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
function appendOperatorNotes(base: string | null | undefined, extra: string) {
  return [base?.trim(), extra.trim()].filter(Boolean).join("\n");
}

export async function createBillingResolution(input: {
  actorUserId: string;
  targetUserId: string;
  type: BillingResolutionType;
  amountUsdMicros: bigint;
  reason: string;
  operatorNotes?: string | null;
  topUpPurchaseId?: string | null;
}) {
  if (input.amountUsdMicros === 0n) {
    return { ok: false as const, error: "Resolution amount cannot be zero." };
  }

  if (input.type === "REFUND" && input.topUpPurchaseId) {
    if (input.amountUsdMicros >= 0n) {
      return { ok: false as const, error: "Refund amount must be negative." };
    }

    const purchase = await db.topUpPurchase.findFirst({
      where: {
        id: input.topUpPurchaseId,
        userId: input.targetUserId
      }
    });

    if (!purchase) {
      return { ok: false as const, error: "Top-up purchase not found for this user." };
    }

    if (purchase.status !== TopUpPurchaseStatus.CREDITED || !purchase.creditedAt) {
      return { ok: false as const, error: "Only credited top-up purchases can be refunded." };
    }

    const refundAmountUsdMicros = -input.amountUsdMicros;
    const remainingRefundableUsdMicros = purchase.creditsUsdMicros - purchase.refundedUsdMicros;

    if (refundAmountUsdMicros > remainingRefundableUsdMicros) {
      return { ok: false as const, error: "Refund amount exceeds the remaining refundable top-up value." };
    }

    const refundReference = `manual_refund:${purchase.id}:${Date.now()}`;

    const applied = await db.$transaction(async (tx) => {
      const resolution = await tx.billingResolution.create({
        data: {
          userId: input.targetUserId,
          topUpPurchaseId: purchase.id,
          type: input.type,
          status: "OPEN",
          amountUsdMicros: input.amountUsdMicros,
          reason: input.reason,
          operatorNotes: appendOperatorNotes(
            input.operatorNotes ?? null,
            `External payment refund must be handled manually. Reference: ${refundReference}`
          ),
          providerRefundId: refundReference
        }
      });

      const currentPurchase = await tx.topUpPurchase.findUnique({
        where: { id: purchase.id }
      });

      if (!currentPurchase) {
        throw new Error("Top-up purchase disappeared before refund application.");
      }

      const currentRemainingRefundable =
        currentPurchase.creditsUsdMicros - currentPurchase.refundedUsdMicros;

      if (refundAmountUsdMicros > currentRemainingRefundable) {
        throw new Error("Refund amount exceeds the remaining refundable balance for this top-up.");
      }

      const balance = await getOrCreateUserBalance(input.targetUserId, tx);
      const balanceBeforeUsdMicros = balance.balanceUsdMicros;
      const balanceAfterUsdMicros = balance.balanceUsdMicros + input.amountUsdMicros;
      const now = new Date();
      const refundedTotalUsdMicros = currentPurchase.refundedUsdMicros + refundAmountUsdMicros;

      await tx.userBalance.update({
        where: { userId: input.targetUserId },
        data: {
          balanceUsdMicros: balanceAfterUsdMicros
        }
      });

      await tx.balanceTransaction.create({
        data: {
          userId: input.targetUserId,
          type: "ADJUSTMENT",
          amountUsdMicros: input.amountUsdMicros,
          balanceBeforeUsdMicros,
          balanceAfterUsdMicros,
          billingResolutionId: resolution.id,
          reason: `${input.type.toLowerCase()}:${input.reason}`
        }
      });

      await tx.topUpPurchase.update({
        where: { id: purchase.id },
        data: {
          refundedUsdMicros: refundedTotalUsdMicros,
          refundedAt: refundedTotalUsdMicros >= currentPurchase.creditsUsdMicros ? now : currentPurchase.refundedAt
        }
      });

      return tx.billingResolution.update({
        where: { id: resolution.id },
        data: {
          status: "APPLIED",
          appliedAt: now
        },
        include: {
          balanceTransaction: true,
          topUpPurchase: true
        }
      });
    });

    await createAuditLog({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: "admin.billing_resolution.create",
      resourceType: "billing_resolution",
      resourceId: applied.id,
      metadata: {
        type: input.type,
        amountUsdMicros: input.amountUsdMicros.toString(),
        reason: input.reason,
        operatorNotes: input.operatorNotes ?? null,
        topUpPurchaseId: purchase.id,
        refundReference
      }
    });

    return { ok: true as const, resolution: applied };
  }

  return db.$transaction(async (tx) => {
    const resolution = await tx.billingResolution.create({
      data: {
        userId: input.targetUserId,
        topUpPurchaseId: input.topUpPurchaseId ?? null,
        type: input.type,
        status: "OPEN",
        amountUsdMicros: input.amountUsdMicros,
        reason: input.reason,
        operatorNotes: input.operatorNotes ?? null
      }
    });

    const balance = await getOrCreateUserBalance(input.targetUserId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balance.balanceUsdMicros + input.amountUsdMicros;

    await tx.userBalance.update({
      where: { userId: input.targetUserId },
      data: {
        balanceUsdMicros: balanceAfterUsdMicros
      }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId: input.targetUserId,
        type: "ADJUSTMENT",
        amountUsdMicros: input.amountUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        billingResolutionId: resolution.id,
        reason: `${input.type.toLowerCase()}:${input.reason}`
      }
    });

    const applied = await tx.billingResolution.update({
      where: { id: resolution.id },
      data: {
        status: "APPLIED",
        appliedAt: new Date()
      },
      include: {
        balanceTransaction: true
      }
    });

    await createAuditLog({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: "admin.billing_resolution.create",
      resourceType: "billing_resolution",
      resourceId: applied.id,
      metadata: {
        type: input.type,
        amountUsdMicros: input.amountUsdMicros.toString(),
        reason: input.reason,
        operatorNotes: input.operatorNotes ?? null,
        balanceTransactionId: transaction.id
      }
    });

    return { ok: true as const, resolution: applied };
  });
}

export async function listRecentBillingResolutions(limit = 50) {
  return db.billingResolution.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      balanceTransaction: true,
      topUpPurchase: true
    }
  });
}
