#!/usr/bin/env node
/**
 * Create the first admin user.
 * Usage: node scripts/create-admin.mjs <email> <password> [name]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const db = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main() {
  const [email, password, name = "Admin"] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: node scripts/create-admin.mjs <email> <password> [name]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`User ${email} already exists.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      plan: "BUILDER"
    }
  });

  // Create initial balance
  await db.userBalance.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      balanceUsdMicros: 0n
    },
    update: {}
  });

  console.log(`Admin user created: ${user.email} (plan: ${user.plan})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
