import crypto from "node:crypto";

import { BalanceTransactionType } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const CODE_PREFIX_LENGTH = 8;

function normalizeRedemptionCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function generatePlaintextRedemptionCode() {
  return `MAX-${crypto.randomBytes(12).toString("base64url").toUpperCase()}`;
}

export function hashRedemptionCode(code: string) {
  return crypto
    .createHmac("sha256", env.API_KEY_PEPPER)
    .update(normalizeRedemptionCode(code))
    .digest("hex");
}

export function getRedemptionCodePrefix(code: string) {
  return normalizeRedemptionCode(code).slice(0, CODE_PREFIX_LENGTH);
}

export async function createRedemptionCode(input: {
  label: string;
  creditAmountUsdMicros: bigint;
  maxRedemptions: number;
  expiresAt?: Date | null;
  createdByUserId?: string | null;
}) {
  const plaintextCode = generatePlaintextRedemptionCode();
  const codeHash = hashRedemptionCode(plaintextCode);
  const record = await (db as any).redemptionCode.create({
    data: {
      codeHash,
      codePrefix: getRedemptionCodePrefix(plaintextCode),
      label: input.label,
      creditAmountUsdMicros: input.creditAmountUsdMicros,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.createdByUserId ?? null
    }
  });

  return {
    record,
    plaintextCode
  };
}

export async function listRedemptionCodes(limit = 50) {
  return (db as any).redemptionCode.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
}

export async function setRedemptionCodeStatus(input: {
  codeId: string;
  status: "ACTIVE" | "DISABLED" | "EXHAUSTED";
}) {
  return (db as any).redemptionCode.update({
    where: { id: input.codeId },
    data: { status: input.status }
  });
}

export async function redeemCode(input: {
  userId: string;
  code: string;
}) {
  const codeHash = hashRedemptionCode(input.code);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const redemptionCode = await (tx as any).redemptionCode.findUnique({
      where: { codeHash }
    });

    if (!redemptionCode) {
      return { ok: false as const, error: "Invalid redemption code." };
    }

    if (redemptionCode.status !== "ACTIVE") {
      return { ok: false as const, error: "This redemption code is not active." };
    }

    if (redemptionCode.expiresAt && redemptionCode.expiresAt <= now) {
      await (tx as any).redemptionCode.update({
        where: { id: redemptionCode.id },
        data: { status: "DISABLED" }
      });

      return { ok: false as const, error: "This redemption code has expired." };
    }

    const existingRedemption = await (tx as any).redemptionCodeRedemption.findFirst({
      where: {
        redemptionCodeId: redemptionCode.id,
        userId: input.userId
      }
    });

    if (existingRedemption) {
      return { ok: false as const, error: "This redemption code has already been used by this account." };
    }

    if (redemptionCode.redeemedCount >= redemptionCode.maxRedemptions) {
      await (tx as any).redemptionCode.update({
        where: { id: redemptionCode.id },
        data: { status: "EXHAUSTED" }
      });

      return { ok: false as const, error: "This redemption code has been fully redeemed." };
    }

    const balance = await getOrCreateUserBalance(input.userId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + redemptionCode.creditAmountUsdMicros;

    await tx.userBalance.update({
      where: { userId: input.userId },
      data: {
        balanceUsdMicros: balanceAfterUsdMicros
      }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId: input.userId,
        type: BalanceTransactionType.CREDIT,
        amountUsdMicros: redemptionCode.creditAmountUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        reason: `redemption_code:${redemptionCode.codePrefix}`
      }
    });

    await (tx as any).redemptionCodeRedemption.create({
      data: {
        redemptionCodeId: redemptionCode.id,
        userId: input.userId,
        balanceTransactionId: transaction.id
      }
    });

    const nextRedeemedCount = redemptionCode.redeemedCount + 1;
    await (tx as any).redemptionCode.update({
      where: { id: redemptionCode.id },
      data: {
        redeemedCount: {
          increment: 1
        },
        status: nextRedeemedCount >= redemptionCode.maxRedemptions ? "EXHAUSTED" : redemptionCode.status
      }
    });

    return {
      ok: true as const,
      amountUsdMicros: redemptionCode.creditAmountUsdMicros,
      balanceAfterUsdMicros,
      balanceTransactionId: transaction.id
    };
  });
}
