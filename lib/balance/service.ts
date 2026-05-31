import { Prisma, type PrismaClient } from "@prisma/client";

import { ApiRouteError } from "@/lib/chat/errors";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

type DbLike = PrismaClient | Prisma.TransactionClient;

export async function getOrCreateUserBalance(userId: string, client: DbLike = db) {
  const existing = await client.userBalance.findUnique({
    where: { userId }
  });

  if (existing) {
    return existing;
  }

  return client.userBalance.create({
    data: {
      userId,
      balanceUsdMicros: 0n
    }
  });
}

export async function assertSufficientBalance(userId: string) {
  const balance = await getOrCreateUserBalance(userId);

  if (balance.balanceUsdMicros < env.MIN_REQUEST_BALANCE_USD_MICROS) {
    throw new ApiRouteError(
      402,
      "insufficient_balance",
      "Insufficient balance for this request."
    );
  }

  return balance;
}
