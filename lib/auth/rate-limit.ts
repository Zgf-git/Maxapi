import { env } from "@/lib/env";

type RateLimitRecord = {
  count: number;
  expiresAt: number;
};

type RateLimitStatus = {
  allowed: boolean;
  retryAfterSeconds: number;
};

interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, value: RateLimitRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async get(key: string) {
    const value = this.store.get(key);

    if (!value) {
      return null;
    }

    if (value.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return value;
  }

  async set(key: string, value: RateLimitRecord) {
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async get(key: string) {
    const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to read auth throttle state.");
    }

    const payload = (await response.json()) as { result: string | null };
    const responseValue = payload.result ? (JSON.parse(payload.result) as [number, number]) : null;

    if (!responseValue) {
      return null;
    }

    return {
      count: responseValue[0],
      expiresAt: responseValue[1]
    };
  }

  async set(key: string, value: RateLimitRecord) {
    const ttlSeconds = Math.max(1, Math.ceil((value.expiresAt - Date.now()) / 1000));
    const response = await fetch(
      `${this.url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(
        JSON.stringify([value.count, value.expiresAt])
      )}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to update auth throttle state.");
    }
  }

  async delete(key: string) {
    const response = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to update auth throttle state.");
    }
  }
}

function createRateLimitStore(): RateLimitStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRateLimitStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }

  return new MemoryRateLimitStore();
}

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const rateLimitStore = createRateLimitStore();

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase() || "unknown";
}

function normalizeIp(ip: string | null) {
  return ip?.split(",")[0]?.trim() || "unknown";
}

function toThrottleKey(identifier: string, ip: string | null) {
  return `login:${normalizeIdentifier(identifier)}:${normalizeIp(ip)}`;
}

export function getLoginThrottleKey(identifier: string, ip: string | null) {
  return toThrottleKey(identifier, ip);
}

export async function getLoginRateLimitStatus(key: string): Promise<RateLimitStatus> {
  const record = await rateLimitStore.get(key);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count < LOGIN_MAX_FAILURES) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000))
  };
}

export async function recordFailedLoginAttempt(key: string) {
  const now = Date.now();
  const existing = await rateLimitStore.get(key);
  const expiresAt = existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : now + LOGIN_WINDOW_MS;
  const count = existing?.expiresAt && existing.expiresAt > now ? existing.count + 1 : 1;

  await rateLimitStore.set(key, {
    count,
    expiresAt
  });
}

export async function clearLoginThrottle(key: string) {
  await rateLimitStore.delete(key);
}

export function getClientIpAddress(request: Request | undefined) {
  if (!request) {
    return null;
  }

  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
}
