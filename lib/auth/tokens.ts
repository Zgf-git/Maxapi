import { createHash, randomBytes } from "node:crypto";
import { AuthTokenType } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(rawToken: string) {
  return createHash("sha256")
    .update(`${env.AUTH_SECRET}:${rawToken}`)
    .digest("hex");
}

function tokenTtlMs(type: AuthTokenType) {
  return type === AuthTokenType.EMAIL_VERIFICATION
    ? EMAIL_VERIFICATION_TTL_MS
    : PASSWORD_RESET_TTL_MS;
}

export async function issueAuthToken(input: {
  userId: string;
  email: string;
  type: AuthTokenType;
}) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + tokenTtlMs(input.type));

  await db.authToken.create({
    data: {
      userId: input.userId,
      email: input.email.toLowerCase(),
      type: input.type,
      tokenHash,
      expiresAt
    }
  });

  return {
    rawToken,
    expiresAt
  };
}

export async function consumeAuthToken(input: {
  rawToken: string;
  type: AuthTokenType;
}) {
  const tokenHash = hashToken(input.rawToken);

  const token = await db.authToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  if (!token || token.type !== input.type) {
    return null;
  }

  if (token.usedAt || token.expiresAt <= new Date()) {
    return null;
  }

  await db.authToken.update({
    where: {
      id: token.id
    },
    data: {
      usedAt: new Date()
    }
  });

  return token;
}

export async function revokeOutstandingTokens(input: {
  userId: string;
  type: AuthTokenType;
}) {
  await db.authToken.updateMany({
    where: {
      userId: input.userId,
      type: input.type,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });
}
