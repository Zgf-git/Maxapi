import { ProviderStatus, ProviderType, UpstreamKeyStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { getApiKeyLastFour, getApiKeyPrefix } from "@/lib/api-keys/service";
import { getProviderDefinition, listProviderDefinitions } from "@/lib/providers/catalog";
import { decryptProviderApiKey, encryptProviderApiKey } from "@/lib/providers/crypto";
import type { ProviderName } from "@/lib/providers/types";
import { sanitizeErrorMessage } from "@/lib/chat/errors";

export type ProviderAdminData = Awaited<ReturnType<typeof listProviderAdminData>>;

export async function ensureProviderRecords() {
  for (const provider of listProviderDefinitions()) {
    await db.provider.upsert({
      where: { slug: provider.slug },
      update: {
        label: provider.label,
        type: ProviderType.OPENAI_COMPATIBLE,
        baseUrl: provider.baseUrl,
        testModel: provider.testModel,
        supportsChat: provider.supportsChat,
        supportsEmbeddings: provider.supportsEmbeddings,
        supportsRerank: provider.supportsRerank
      },
      create: {
        slug: provider.slug,
        label: provider.label,
        type: ProviderType.OPENAI_COMPATIBLE,
        baseUrl: provider.baseUrl,
        testModel: provider.testModel,
        supportsChat: provider.supportsChat,
        supportsEmbeddings: provider.supportsEmbeddings,
        supportsRerank: provider.supportsRerank,
        status: ProviderStatus.ACTIVE
      }
    });
  }
}

export async function listProviderAdminData() {
  await ensureProviderRecords();

  return db.provider.findMany({
    orderBy: { slug: "asc" },
    include: {
      upstreamKeys: {
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
      }
    }
  });
}

export async function createUpstreamApiKey(input: {
  provider: ProviderName;
  displayName: string;
  apiKey: string;
  priority: number;
  baseUrlOverride?: string | null;
}) {
  await ensureProviderRecords();
  const providerRecord = await db.provider.findUnique({
    where: { slug: input.provider }
  });

  if (!providerRecord) {
    throw new Error("Provider not found.");
  }

  return db.upstreamApiKey.create({
    data: {
      providerId: providerRecord.id,
      displayName: input.displayName,
      keyCiphertext: encryptProviderApiKey(input.apiKey),
      keyPrefix: getApiKeyPrefix(input.apiKey),
      lastFour: getApiKeyLastFour(input.apiKey),
      priority: input.priority,
      baseUrlOverride: input.baseUrlOverride ?? null
    }
  });
}

export async function updateProviderSettings(input: {
  provider: ProviderName;
  label: string;
  baseUrl: string;
  testModel: string;
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  supportsRerank?: boolean;
  status: ProviderStatus;
}) {
  await ensureProviderRecords();

  return db.provider.update({
    where: { slug: input.provider },
    data: {
      label: input.label,
      baseUrl: input.baseUrl,
      testModel: input.testModel,
      supportsChat: input.supportsChat,
      supportsEmbeddings: input.supportsEmbeddings,
      supportsRerank: input.supportsRerank ?? false,
      status: input.status
    }
  });
}

export async function setUpstreamApiKeyStatus(keyId: string, status: UpstreamKeyStatus) {
  return db.upstreamApiKey.update({
    where: { id: keyId },
    data: { status }
  });
}

export async function touchUpstreamApiKeyHealth(input: {
  keyId: string;
  ok: boolean;
  errorMessage?: string | null;
}) {
  return db.upstreamApiKey.update({
    where: { id: input.keyId },
    data: {
      lastTestedAt: new Date(),
      lastErrorAt: input.ok ? null : new Date(),
      lastErrorMessage: input.ok ? null : input.errorMessage ?? null,
      errorCount: input.ok ? 0 : { increment: 1 }
    }
  });
}

export async function getRuntimeProviderConfig(provider: ProviderName) {
  await ensureProviderRecords();

  const providerRecord = await db.provider.findUnique({
    where: { slug: provider },
    include: {
      upstreamKeys: {
        where: { status: UpstreamKeyStatus.ACTIVE },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
      }
    }
  });

  const definition = getProviderDefinition(provider);

  if (!providerRecord || providerRecord.status !== ProviderStatus.ACTIVE) {
    return null;
  }

  return {
    provider,
    label: providerRecord.label,
    baseUrl: providerRecord.baseUrl || definition.baseUrl,
    testModel: providerRecord.testModel || definition.testModel,
    supportsChat: providerRecord.supportsChat,
    supportsEmbeddings: providerRecord.supportsEmbeddings,
    supportsRerank: (providerRecord as typeof providerRecord & { supportsRerank?: boolean }).supportsRerank ?? definition.supportsRerank,
    keys: providerRecord.upstreamKeys.map((key: (typeof providerRecord.upstreamKeys)[number]) => ({
      id: key.id,
      apiKey: decryptProviderApiKey(key.keyCiphertext),
      baseUrlOverride: key.baseUrlOverride
    }))
  };
}

export async function testUpstreamApiKey(keyId: string) {
  const keyRecord = await db.upstreamApiKey.findUnique({
    where: { id: keyId },
    include: { provider: true }
  });

  if (!keyRecord) {
    throw new Error("Upstream key not found.");
  }

  const provider = keyRecord.provider.slug as ProviderName;
  const baseUrl = (keyRecord.baseUrlOverride ?? keyRecord.provider.baseUrl).replace(/\/$/, "");
  const apiKey = decryptProviderApiKey(keyRecord.keyCiphertext);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: keyRecord.provider.testModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = sanitizeErrorMessage(await response.text());
      await touchUpstreamApiKeyHealth({
        keyId,
        ok: false,
        errorMessage: errorText ?? `HTTP ${response.status}`
      });

      return {
        ok: false as const,
        message: errorText ?? `HTTP ${response.status}`
      };
    }

    await touchUpstreamApiKeyHealth({
      keyId,
      ok: true
    });

    return {
      ok: true as const,
      message: "Upstream key test passed."
    };
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown upstream error.");

    await touchUpstreamApiKeyHealth({
      keyId,
      ok: false,
      errorMessage: message
    });

    return {
      ok: false as const,
      message: message ?? "Unknown upstream error."
    };
  }
}
