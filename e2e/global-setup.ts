import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Load environment variables for database connection
require("dotenv").config({ path: ".env.local" });

const db = new PrismaClient();

async function checkDatabaseConnection(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("\n❌ Database connection failed!");
    console.error("   E2E tests require a running PostgreSQL database.");
    console.error("\n   Quick start:");
    console.error('   docker run -d --name maxapi-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=maxapi -p 5432:5432 postgres:16-alpine');
    console.error("\n   Then apply migrations:");
    console.error("   npx prisma migrate deploy");
    console.error("\n");
    throw error;
  }
}

const TEST_USERS = [
  { email: "e2e-user@maxapi.test", password: "TestPass123!", name: "E2E User", role: "USER" as const },
  { email: "e2e-admin@maxapi.test", password: "TestPass123!", name: "E2E Admin", role: "ADMIN" as const },
  { email: "e2e-owner@maxapi.test", password: "TestPass123!", name: "E2E Owner", role: "OWNER" as const },
];

const SEED_FILE = path.join(__dirname, ".auth", "test-user-ids.json");

export default async function globalSetup() {
  await checkDatabaseConnection();

  const userIds: Record<string, string> = {};

  for (const user of TEST_USERS) {
    const existing = await db.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      userIds[user.role] = existing.id;
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 12);

    const created = await db.user.create({
      data: {
        email: user.email,
        name: user.name,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: user.role,
        userBalance: {
          create: {
            balanceUsdMicros: 10_000_000n, // $10.00
          },
        },
      },
    });

    userIds[user.role] = created.id;
  }

  fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  fs.writeFileSync(SEED_FILE, JSON.stringify(userIds, null, 2));

  await db.$disconnect();
}
