import { env } from "@/lib/env";
import type { ProviderName, RoutePolicy } from "@/lib/providers/types";

type StickyRouteBinding = {
  apiKeyId: string;
  sessionId: string;
  routePolicy: RoutePolicy;
  provider: ProviderName;
  model: string;
};

interface StickyRouteStore {
  get(key: string): Promise<StickyRouteBinding | null>;
  set(key: string, value: StickyRouteBinding, ttlSeconds: number): Promise<void>;
}

class MemoryStickyRouteStore implements StickyRouteStore {
  private store = new Map<string, { value: StickyRouteBinding; expiresAt: number }>();

  async get(key: string): Promise<StickyRouteBinding | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: StickyRouteBinding, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}

class UpstashStickyRouteStore implements StickyRouteStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async get(key: string): Promise<StickyRouteBinding | null> {
    const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { result: string | null };

    if (!payload.result) {
      return null;
    }

    try {
      return JSON.parse(payload.result) as StickyRouteBinding;
    } catch {
      return null;
    }
  }

  async set(key: string, value: StickyRouteBinding, ttlSeconds: number): Promise<void> {
    const response = await fetch(
      `${this.url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(JSON.stringify(value))}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to persist sticky route binding.");
    }
  }
}

function createStickyRouteStore(): StickyRouteStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashStickyRouteStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }

  return new MemoryStickyRouteStore();
}

const stickyRouteStore = createStickyRouteStore();

function buildStickyRouteKey(apiKeyId: string, sessionId: string) {
  return `route:sticky:v1:${apiKeyId}:${sessionId}`;
}

export async function getStickyRouteBinding(input: {
  apiKeyId: string;
  sessionId: string;
  routePolicy: RoutePolicy;
}) {
  const binding = await stickyRouteStore.get(buildStickyRouteKey(input.apiKeyId, input.sessionId));

  if (!binding || binding.routePolicy !== input.routePolicy) {
    return null;
  }

  return binding;
}

export async function setStickyRouteBinding(
  input: StickyRouteBinding,
  ttlSeconds = env.ROUTING_STICKY_TTL_SECONDS
) {
  await stickyRouteStore.set(
    buildStickyRouteKey(input.apiKeyId, input.sessionId),
    input,
    ttlSeconds
  );
}
