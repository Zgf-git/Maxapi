import { BalanceTransactionType, Prisma } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listPublicPaymentProviders } from "@/lib/payments/providers";
import { listPublicTopUpPackages } from "@/lib/payments/topup-packages";

export const DEVELOPER_CREDIT_USD_MICROS = 10_000_000n;

const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingSummaryInput = {
  spendLast24hUsdMicros: bigint | null | undefined;
  spendLast7dUsdMicros: bigint | null | undefined;
  creditsLast30dUsdMicros: bigint | null | undefined;
  lastChargeAt: Date | null;
};

export type BillingSummary = {
  spendLast24hUsdMicros: bigint;
  spendLast7dUsdMicros: bigint;
  creditsLast30dUsdMicros: bigint;
  lastChargeAt: Date | null;
};

export type BillingTransactionRow = Prisma.BalanceTransactionGetPayload<{
  include: {
    topUpPurchase: true;
    usageLedgerEntry: {
      include: {
        requestLog: true;
      };
    };
  };
}>;

export type BillingUsageLedgerRow = Prisma.UsageLedgerEntryGetPayload<{
  include: {
    requestLog: true;
  };
}>;

export type BillingTopUpPurchaseRow = Prisma.TopUpPurchaseGetPayload<{
  include: {
    balanceTransaction: true;
    billingResolutions: true;
  };
}>;

export type BillingResolutionRow = Prisma.BillingResolutionGetPayload<{
  include: {
    topUpPurchase: true;
    balanceTransaction: true;
  };
}>;

export function buildBillingSummary(input: BillingSummaryInput): BillingSummary {
  return {
    spendLast24hUsdMicros: input.spendLast24hUsdMicros ?? 0n,
    spendLast7dUsdMicros: input.spendLast7dUsdMicros ?? 0n,
    creditsLast30dUsdMicros: input.creditsLast30dUsdMicros ?? 0n,
    lastChargeAt: input.lastChargeAt
  };
}

export function canGrantDeveloperCredit() {
  return process.env.NODE_ENV === "development";
}

async function sumTransactions({
  userId,
  types,
  createdAtGte
}: {
  userId: string;
  types: BalanceTransactionType[];
  createdAtGte: Date;
}) {
  const result = await db.balanceTransaction.aggregate({
    where: {
      userId,
      type: {
        in: types
      },
      // Intentionally no amountUsdMicros filter here. Refunds (negative adjustments)
      // should still be reflected in aggregates so the dashboard stays truthful.
      createdAt: {
        gte: createdAtGte
      }
    },
    _sum: {
      amountUsdMicros: true
    }
  });

  return result._sum.amountUsdMicros ?? 0n;
}

export async function getBillingPageData(userId: string) {
  const now = Date.now();
  const last24h = new Date(now - DAY_MS);
  const last7d = new Date(now - 7 * DAY_MS);
  const last30d = new Date(now - 30 * DAY_MS);

  const [
    balance,
    spendLast24hUsdMicros,
    spendLast7dUsdMicros,
    creditsLast30dUsdMicros,
    lastCharge,
    transactions,
    usageLedgerEntries,
    topUpPurchases,
    billingResolutions
  ] = await Promise.all([
    getOrCreateUserBalance(userId),
    sumTransactions({
      userId,
      types: [BalanceTransactionType.DEBIT],
      createdAtGte: last24h
    }),
    sumTransactions({
      userId,
      types: [BalanceTransactionType.DEBIT],
      createdAtGte: last7d
    }),
    sumTransactions({
      userId,
      types: [BalanceTransactionType.CREDIT, BalanceTransactionType.ADJUSTMENT],
      createdAtGte: last30d
    }),
    db.balanceTransaction.findFirst({
      where: {
        userId,
        type: BalanceTransactionType.DEBIT
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.balanceTransaction.findMany({
      where: {
        userId
      },
      include: {
        topUpPurchase: true,
        usageLedgerEntry: {
          include: {
            requestLog: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    }),
    db.usageLedgerEntry.findMany({
      where: {
        userId
      },
      include: {
        requestLog: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    }),
    db.topUpPurchase.findMany({
      where: {
        userId
      },
      include: {
        balanceTransaction: true,
        billingResolutions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    }),
    db.billingResolution.findMany({
      where: {
        userId
      },
      include: {
        topUpPurchase: true,
        balanceTransaction: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    })
  ]);

  return {
    balance,
    minimumRequestBalanceUsdMicros: env.MIN_REQUEST_BALANCE_USD_MICROS,
    canGrantDeveloperCredit: canGrantDeveloperCredit(),
    developerCreditUsdMicros: DEVELOPER_CREDIT_USD_MICROS,
    paymentProviders: await listPublicPaymentProviders(),
    topUpPackages: listPublicTopUpPackages(),
    summary: buildBillingSummary({
      spendLast24hUsdMicros,
      spendLast7dUsdMicros,
      creditsLast30dUsdMicros,
      lastChargeAt: lastCharge?.createdAt ?? null
    }),
    transactions,
    usageLedgerEntries,
    topUpPurchases,
    billingResolutions
  };
}

export async function grantDeveloperCredit(userId: string) {
  if (!canGrantDeveloperCredit()) {
    return {
      ok: false as const,
      error: "Developer credit is only available in local development."
    };
  }

  const alreadyGranted = await db.balanceTransaction.findFirst({
    where: { userId, reason: "developer_credit" }
  });

  if (alreadyGranted) {
    return {
      ok: false as const,
      error: "Developer credit has already been granted to this account."
    };
  }

  await db.$transaction(async (tx) => {
    const balance = await getOrCreateUserBalance(userId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + DEVELOPER_CREDIT_USD_MICROS;

    await tx.userBalance.update({
      where: {
        userId
      },
      data: {
        balanceUsdMicros: balanceAfterUsdMicros
      }
    });

    await tx.balanceTransaction.create({
      data: {
        userId,
        type: BalanceTransactionType.CREDIT,
        amountUsdMicros: DEVELOPER_CREDIT_USD_MICROS,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        reason: "developer_credit"
      }
    });
  });

  return {
    ok: true as const
  };
}
