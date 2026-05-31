import { getProviderDefinition } from "@/lib/providers/catalog";
import { createEnvProviderKeyPool } from "@/lib/providers/key-pool";
import {
  OpenAICompatibleProvider,
  type OpenAICompatibleProviderConfig
} from "@/lib/providers/openai-compatible";
import type { ChatProvider, ProviderName } from "@/lib/providers/types";

export function getEnvBackedProviderConfig(provider: ProviderName): OpenAICompatibleProviderConfig | null {
  const definition = getProviderDefinition(provider);
  const keyPool = createEnvProviderKeyPool(provider);

  if (!keyPool) {
    return null;
  }

  return {
    provider,
    baseUrl: definition.baseUrl,
    keyPool
  };
}

export function createEnvBackedProvider(provider: ProviderName): ChatProvider | null {
  const config = getEnvBackedProviderConfig(provider);

  if (!config) {
    return null;
  }

  return new OpenAICompatibleProvider(config);
}

export function getRequiredEnvBackedProviderConfig(provider: ProviderName): OpenAICompatibleProviderConfig {
  const resolved = getEnvBackedProviderConfig(provider);

  if (!resolved) {
    throw new Error(`Provider not configured: ${provider}`);
  }

  return resolved;
}
