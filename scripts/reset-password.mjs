#!/usr/bin/env node
/**
 * Reset a user's password directly in the database.
 * Usage: node scripts/reset-password.mjs <email> <newPassword>
 */
import { PrismaClient, AuthTokenType } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const db = new PrismaClient();

async function main() {
  const [emailArg, password] = process.argv.slice(2);

  if (!emailArg || !password) {
    console.error("Usage: node scripts/reset-password.mjs <email> <newPassword>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const email = emailArg.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found for email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  await db.authToken.updateMany({
    where: {
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET,
      usedAt: null
    },
    data: { usedAt: new Date() }
  });

  console.log(`Password updated for ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
