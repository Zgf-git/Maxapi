import crypto from "node:crypto";

import { ApiKeyStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const API_KEY_PREFIX = "mk_live_";
const PREFIX_LENGTH = 16;

export function generatePlaintextApiKey() {
  const secret = crypto.randomBytes(24).toString("base64url");
  return `${API_KEY_PREFIX}${secret}`;
}

export function hashApiKey(plaintextKey: string) {
  return crypto.createHmac("sha256", env.API_KEY_PEPPER).update(plaintextKey).digest("hex");
}

export function getApiKeyPrefix(plaintextKey: string) {
  return plaintextKey.slice(0, PREFIX_LENGTH);
}

export function getApiKeyLastFour(plaintextKey: string) {
  return plaintextKey.slice(-4);
}

export function maskApiKeySuffix(lastFour: string) {
  return `••••${lastFour}`;
}

type ApiKeyControlInput = {
  expiresAt?: Date;
  requestsPerMinuteLimit?: number;
  concurrentRequestsLimit?: number;
  dailyRequestLimit?: number;
};

type ApiKeyControlFields = {
  isEnabled?: boolean | null;
  expiresAt?: Date | null;
  requestsPerMinuteLimit?: number | null;
  concurrentRequestsLimit?: number | null;
  dailyRequestLimit?: number | null;
  dailyRequestCount?: number | null;
  dailyRequestWindowStart?: Date | null;
};

function normalizeApiKeyControls(input?: ApiKeyControlInput) {
  return {
    expiresAt: input?.expiresAt && !Number.isNaN(input.expiresAt.getTime()) ? input.expiresAt : null,
    requestsPerMinuteLimit: input?.requestsPerMinuteLimit ?? null,
    concurrentRequestsLimit: input?.concurrentRequestsLimit ?? null,
    dailyRequestLimit: input?.dailyRequestLimit ?? null
  };
}

export async function createApiKey(userId: string, name: string, input?: ApiKeyControlInput) {
  const plaintextKey = generatePlaintextApiKey();
  const keyHash = hashApiKey(plaintextKey);
  const keyPrefix = getApiKeyPrefix(plaintextKey);
  const lastFour = getApiKeyLastFour(plaintextKey);
  const controls = normalizeApiKeyControls(input);

  const record = await db.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      lastFour,
      ...controls
    }
  });

  return {
    id: record.id,
    plaintextKey,
    keyPrefix,
    lastFour
  };
}

export async function listApiKeys(userId: string) {
  const records = (await db.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  })) as Array<Awaited<ReturnType<typeof db.apiKey.findMany>>[number] & ApiKeyControlFields>;

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    maskedSuffix: maskApiKeySuffix(record.lastFour),
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    status: record.status,
    isEnabled: record.isEnabled,
    expiresAt: record.expiresAt,
    requestsPerMinuteLimit: record.requestsPerMinuteLimit,
    concurrentRequestsLimit: record.concurrentRequestsLimit,
    dailyRequestLimit: record.dailyRequestLimit,
    dailyRequestCount: record.dailyRequestCount,
    dailyRequestWindowStart: record.dailyRequestWindowStart
  }));
}

export async function updateApiKeyControls(userId: string, keyId: string, input: ApiKeyControlInput & { isEnabled: boolean }) {
  const existing = await db.apiKey.findFirst({
    where: {
      id: keyId,
      userId
    }
  });

  if (!existing) {
    return { ok: false as const, error: "API key not found." };
  }

  await db.apiKey.update({
    where: { id: keyId },
    data: {
      isEnabled: input.isEnabled,
      ...normalizeApiKeyControls(input)
    } as never
  });

  return { ok: true as const };
}

export async function revokeApiKey(userId: string, keyId: string) {
  const existing = await db.apiKey.findFirst({
    where: {
      id: keyId,
      userId
    }
  });

  if (!existing) {
    return { ok: false as const, error: "API key not found." };
  }

  if (existing.status === ApiKeyStatus.REVOKED) {
    return { ok: true as const };
  }

  await db.apiKey.update({
    where: { id: keyId },
    data: {
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date()
    }
  });

  return { ok: true as const };
}

export async function verifyApiKey(plaintextKey: string) {
  const keyHash = hashApiKey(plaintextKey);

  return db.apiKey.findFirst({
    where: {
      keyHash,
      status: ApiKeyStatus.ACTIVE
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}

export async function findApiKeyByHash(plaintextKey: string) {
  const keyHash = hashApiKey(plaintextKey);

  return db.apiKey.findFirst({
    where: {
      keyHash
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}

export async function touchApiKeyLastUsed(apiKeyId: string) {
  await db.apiKey.update({
    where: { id: apiKeyId },
    data: {
      lastUsedAt: new Date()
    }
  });
}
