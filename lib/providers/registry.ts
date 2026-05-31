import { getRuntimeProviderConfig } from "@/lib/providers/admin";
import { getProviderDefinition, listProviderDefinitions } from "@/lib/providers/catalog";
import { createProviderKeyPool } from "@/lib/providers/key-pool";
import { createEnvBackedProvider } from "@/lib/providers/factory";
import { OpenAICompatibleProvider } from "@/lib/providers/openai-compatible";
import type { ChatProvider, ProviderName } from "@/lib/providers/types";

type CachedProvider = {
  expiresAt: number;
  provider: ChatProvider;
};

type ProviderCapability = "chat" | "embeddings" | "rerank";

declare global {
  var maxapiProviderRegistryCache: Partial<Record<ProviderName, CachedProvider>> | undefined;
}

const CACHE_TTL_MS = 30_000;

function getRegistryCache() {
  if (!global.maxapiProviderRegistryCache) {
    global.maxapiProviderRegistryCache = {};
  }

  return global.maxapiProviderRegistryCache;
}

function buildEnvFallbackProvider(provider: ProviderName): ChatProvider | null {
  return createEnvBackedProvider(provider);
}

async function buildDatabaseBackedProvider(provider: ProviderName): Promise<ChatProvider | null> {
  const runtimeConfig = await getRuntimeProviderConfig(provider);

  if (!runtimeConfig || runtimeConfig.keys.length === 0) {
    return null;
  }

  const keyPool =
    createProviderKeyPool(
      provider,
      runtimeConfig.keys.map((key: (typeof runtimeConfig.keys)[number]) => ({
        id: key.id,
        apiKey: key.apiKey,
        baseUrlOverride: key.baseUrlOverride
      }))
    );

  return new OpenAICompatibleProvider({
    provider,
    baseUrl: runtimeConfig.baseUrl,
    keyPool
  });
}

export async function getChatProvider(provider: ProviderName) {
  const cache = getRegistryCache();
  const cached = cache[provider];

  if (cached && cached.expiresAt > Date.now()) {
    return cached.provider;
  }

  const resolved =
    (await buildDatabaseBackedProvider(provider)) ?? buildEnvFallbackProvider(provider);

  if (!resolved) {
    throw new Error(`Provider not configured: ${provider}`);
  }

  cache[provider] = {
    provider: resolved,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return resolved;
}

async function providerSupportsCapability(provider: ProviderName, capability: ProviderCapability) {
  const runtimeConfig = await getRuntimeProviderConfig(provider);

  if (runtimeConfig) {
    if (capability === "chat") {
      return runtimeConfig.supportsChat;
    }

    if (capability === "embeddings") {
      return runtimeConfig.supportsEmbeddings;
    }

    return runtimeConfig.supportsRerank;
  }

  const definition = getProviderDefinition(provider);
  if (capability === "chat") {
    return definition.supportsChat;
  }

  if (capability === "embeddings") {
    return definition.supportsEmbeddings;
  }

  return definition.supportsRerank;
}

export async function getProviderForCapability(provider: ProviderName, capability: ProviderCapability) {
  const supported = await providerSupportsCapability(provider, capability);

  if (!supported) {
    throw new Error(`Provider does not support ${capability}: ${provider}`);
  }

  return getChatProvider(provider);
}

export async function getFirstConfiguredProviderForCapability(capability: ProviderCapability) {
  for (const { slug } of listProviderDefinitions()) {
    try {
      return await getProviderForCapability(slug, capability);
    } catch {
      continue;
    }
  }

  throw new Error(`No configured provider supports ${capability}.`);
}

export async function isProviderConfigured(provider: ProviderName) {
  try {
    await getChatProvider(provider);
    return true;
  } catch {
    return false;
  }
}

export async function getConfiguredProviders() {
  const providers = await Promise.all(
    listProviderDefinitions().map(async ({ slug: provider }) =>
      (await isProviderConfigured(provider)) ? provider : null
    )
  );

  return providers.filter((provider): provider is ProviderName => provider !== null);
}
