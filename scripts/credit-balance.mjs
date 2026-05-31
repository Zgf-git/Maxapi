import fs from "node:fs";
import path from "node:path";

import { PrismaClient, BalanceTransactionType } from "@prisma/client";

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filepath = path.resolve(process.cwd(), filename);

    if (!fs.existsSync(filepath)) {
      continue;
    }

    const contents = fs.readFileSync(filepath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const rawValue = trimmed.slice(separatorIndex + 1).replace(/^"(.*)"$/, "$1");

      if (!process.env[key]) {
        process.env[key] = rawValue;
      }
    }
  }
}

loadLocalEnv();

const prisma = new PrismaClient();
const email = process.argv[2];
const amountUsdMicros = BigInt(process.argv[3] ?? "10000000");

if (!email) {
  console.error("Usage: npm run balance:credit -- <email> [amountUsdMicros]");
  process.exit(1);
}

const user = await prisma.user.findUnique({
  where: { email: email.toLowerCase() }
});

if (!user) {
  console.error(`No user found for email ${email}.`);
  process.exit(1);
}

await prisma.$transaction(async (tx) => {
  const balance =
    (await tx.userBalance.findUnique({
      where: { userId: user.id }
    })) ??
    (await tx.userBalance.create({
      data: {
        userId: user.id,
        balanceUsdMicros: 0n
      }
    }));

  const balanceBeforeUsdMicros = balance.balanceUsdMicros;
  const balanceAfterUsdMicros = balanceBeforeUsdMicros + amountUsdMicros;

  await tx.userBalance.update({
    where: { userId: user.id },
    data: {
      balanceUsdMicros: balanceAfterUsdMicros
    }
  });

  await tx.balanceTransaction.create({
    data: {
      userId: user.id,
      type: BalanceTransactionType.ADJUSTMENT,
      amountUsdMicros,
      balanceBeforeUsdMicros,
      balanceAfterUsdMicros,
      reason: "developer_credit"
    }
  });
});

console.log(
  `Credited ${amountUsdMicros.toString()} USD micros to ${email.toLowerCase()}.`
);

await prisma.$disconnect();
