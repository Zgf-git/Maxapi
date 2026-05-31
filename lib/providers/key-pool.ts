import { env } from "@/lib/env";
import { getProviderDefinition } from "@/lib/providers/catalog";
import type { ProviderName } from "@/lib/providers/types";

export const KEY_POOL_CIRCUIT_BREAKER_THRESHOLD = 3;
export const KEY_POOL_BASE_COOLDOWN_MS = 1_000;
export const KEY_POOL_MAX_COOLDOWN_MS = 60_000;

export type KeyPoolEntry = {
  id: string;
  apiKey: string;
  baseUrlOverride: string | null;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  cooldownUntil: Date | null;
  totalRequests: number;
  totalFailures: number;
};

type KeyPoolSeed =
  | string
  | {
      id: string;
      apiKey: string;
      baseUrlOverride?: string | null;
    };

function calculateCooldownMs(consecutiveFailures: number): number {
  const ms = KEY_POOL_BASE_COOLDOWN_MS * Math.pow(2, consecutiveFailures - 1);

  return Math.min(ms, KEY_POOL_MAX_COOLDOWN_MS);
}

export class ProviderKeyPool {
  private entries: KeyPoolEntry[];
  private cursor = 0;

  constructor(providerLabel: string, keys: KeyPoolSeed[]) {
    if (keys.length === 0) {
      throw new Error(`${providerLabel} key pool requires at least one API key.`);
    }

    this.entries = keys.map((seed, i) => ({
      id: typeof seed === "string" ? `key-${i}` : seed.id,
      apiKey: typeof seed === "string" ? seed : seed.apiKey,
      baseUrlOverride: typeof seed === "string" ? null : seed.baseUrlOverride ?? null,
      isHealthy: true,
      consecutiveFailures: 0,
      lastFailureAt: null,
      cooldownUntil: null,
      totalRequests: 0,
      totalFailures: 0
    }));
  }

  getNextKey(): KeyPoolEntry {
    const now = Date.now();
    const healthy = this.entries.filter((e) => {
      if (e.cooldownUntil && e.cooldownUntil.getTime() > now) {
        return false;
      }

      return e.isHealthy;
    });
    const pool = healthy.length > 0 ? healthy : this.entries;
    const entry = pool[this.cursor % pool.length];
    this.cursor = (this.cursor + 1) % pool.length;
    entry.totalRequests++;
    return entry;
  }

  reportSuccess(entry: KeyPoolEntry): void {
    const found = this.entries.find((e) => e.id === entry.id);

    if (!found) {
      return;
    }

    found.consecutiveFailures = 0;
    found.isHealthy = true;
    found.cooldownUntil = null;
  }

  reportFailure(entry: KeyPoolEntry): void {
    const found = this.entries.find((e) => e.id === entry.id);

    if (!found) {
      return;
    }

    found.consecutiveFailures++;
    found.totalFailures++;
    found.lastFailureAt = new Date();
    found.cooldownUntil = new Date(Date.now() + calculateCooldownMs(found.consecutiveFailures));

    if (found.consecutiveFailures >= KEY_POOL_CIRCUIT_BREAKER_THRESHOLD) {
      found.isHealthy = false;
    }
  }

  getSnapshot(): KeyPoolEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  getPublicSnapshot(): Omit<KeyPoolEntry, "apiKey">[] {
    return this.entries.map(({ apiKey: _ignored, ...rest }) => rest);
  }
}

const providerEnvKeyReaders: Record<ProviderName, () => string[]> = {
  openai: () =>
    env.OPENAI_API_KEYS?.length
      ? env.OPENAI_API_KEYS
      : env.OPENAI_API_KEY
        ? [env.OPENAI_API_KEY]
        : [],
  apimart: () =>
    env.APIMART_API_KEYS?.length
      ? env.APIMART_API_KEYS
      : env.APIMART_API_KEY
        ? [env.APIMART_API_KEY]
        : [],
  openrouter: () =>
    env.OPENROUTER_API_KEYS?.length
      ? env.OPENROUTER_API_KEYS
      : env.OPENROUTER_API_KEY
        ? [env.OPENROUTER_API_KEY]
        : [],
  deepseek: () =>
    env.DEEPSEEK_API_KEYS?.length
      ? env.DEEPSEEK_API_KEYS
      : env.DEEPSEEK_API_KEY
        ? [env.DEEPSEEK_API_KEY]
        : [],
  google: () =>
    env.GOOGLE_API_KEYS?.length
      ? env.GOOGLE_API_KEYS
      : env.GOOGLE_API_KEY
        ? [env.GOOGLE_API_KEY]
        : []
};

export function getProviderEnvKeys(provider: ProviderName) {
  return providerEnvKeyReaders[provider]();
}

export function createProviderKeyPool(provider: ProviderName, keys: KeyPoolSeed[]) {
  const definition = getProviderDefinition(provider);
  return new ProviderKeyPool(definition.label, keys);
}

export function createEnvProviderKeyPool(provider: ProviderName) {
  const keys = getProviderEnvKeys(provider);

  if (keys.length === 0) {
    return null;
  }

  return createProviderKeyPool(provider, keys);
}
