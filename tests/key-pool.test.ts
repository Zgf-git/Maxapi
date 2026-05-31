import { afterEach, describe, expect, it, vi } from "vitest";

import {
  KEY_POOL_BASE_COOLDOWN_MS,
  KEY_POOL_CIRCUIT_BREAKER_THRESHOLD,
  KEY_POOL_MAX_COOLDOWN_MS,
  ProviderKeyPool
} from "@/lib/providers/key-pool";

describe("ProviderKeyPool", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires at least one key", () => {
    expect(() => new ProviderKeyPool("OpenAI", [])).toThrow("OpenAI key pool requires at least one API key.");
  });

  it("round-robins across keys", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a", "key-b", "key-c"]);

    const k1 = pool.getNextKey();
    const k2 = pool.getNextKey();
    const k3 = pool.getNextKey();
    const k4 = pool.getNextKey();

    expect(k1.apiKey).toBe("key-a");
    expect(k2.apiKey).toBe("key-b");
    expect(k3.apiKey).toBe("key-c");
    expect(k4.apiKey).toBe("key-a");
  });

  it("increments totalRequests on each getNextKey", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    expect(entry.totalRequests).toBe(1);
  });

  it("marks a key unhealthy after consecutive failures reach threshold", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    for (let i = 0; i < KEY_POOL_CIRCUIT_BREAKER_THRESHOLD - 1; i++) {
      pool.reportFailure(entry);
    }

    expect(pool.getSnapshot()[0].isHealthy).toBe(true);

    pool.reportFailure(entry);

    expect(pool.getSnapshot()[0].isHealthy).toBe(false);
    expect(pool.getSnapshot()[0].consecutiveFailures).toBe(KEY_POOL_CIRCUIT_BREAKER_THRESHOLD);
  });

  it("restores a key to healthy after a success", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    for (let i = 0; i < KEY_POOL_CIRCUIT_BREAKER_THRESHOLD; i++) {
      pool.reportFailure(entry);
    }

    expect(pool.getSnapshot()[0].isHealthy).toBe(false);

    pool.reportSuccess(entry);

    expect(pool.getSnapshot()[0].isHealthy).toBe(true);
    expect(pool.getSnapshot()[0].consecutiveFailures).toBe(0);
    expect(pool.getSnapshot()[0].cooldownUntil).toBeNull();
  });

  it("skips unhealthy keys when selecting next key", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a", "key-b"]);
    const a = pool.getNextKey();

    for (let i = 0; i < KEY_POOL_CIRCUIT_BREAKER_THRESHOLD; i++) {
      pool.reportFailure(a);
    }

    const next = pool.getNextKey();

    expect(next.apiKey).toBe("key-b");
  });

  it("falls back to all keys when every key is unhealthy", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a", "key-b"]);
    const a = pool.getNextKey();
    const b = pool.getNextKey();

    for (let i = 0; i < KEY_POOL_CIRCUIT_BREAKER_THRESHOLD; i++) {
      pool.reportFailure(a);
      pool.reportFailure(b);
    }

    expect(pool.getSnapshot()[0].isHealthy).toBe(false);
    expect(pool.getSnapshot()[1].isHealthy).toBe(false);

    const next = pool.getNextKey();

    expect(next.apiKey).toBe("key-a");
  });

  it("returns an independent snapshot", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const snapshot = pool.getSnapshot();

    snapshot[0].consecutiveFailures = 99;

    expect(pool.getSnapshot()[0].consecutiveFailures).toBe(0);
  });

  it("applies exponential backoff cooldown on failure", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    pool.reportFailure(entry);

    const snapshot = pool.getSnapshot()[0];
    const expectedCooldown = KEY_POOL_BASE_COOLDOWN_MS * Math.pow(2, 0); // 1s

    expect(snapshot.cooldownUntil).not.toBeNull();
    expect(snapshot.cooldownUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(snapshot.cooldownUntil!.getTime()).toBeLessThanOrEqual(Date.now() + expectedCooldown + 50);
  });

  it("doubles cooldown on consecutive failures", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    pool.reportFailure(entry);
    pool.reportFailure(entry);

    const snapshot = pool.getSnapshot()[0];
    const expectedCooldown = KEY_POOL_BASE_COOLDOWN_MS * Math.pow(2, 1); // 2s

    expect(snapshot.cooldownUntil!.getTime()).toBeLessThanOrEqual(Date.now() + expectedCooldown + 50);
  });

  it("caps cooldown at max threshold", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    for (let i = 0; i < 10; i++) {
      pool.reportFailure(entry);
    }

    const snapshot = pool.getSnapshot()[0];

    expect(snapshot.cooldownUntil!.getTime()).toBeLessThanOrEqual(Date.now() + KEY_POOL_MAX_COOLDOWN_MS + 50);
  });

  it("skips keys that are still in cooldown", () => {
    const pool = new ProviderKeyPool("OpenAI", ["key-a", "key-b"]);
    const a = pool.getNextKey();

    pool.reportFailure(a);

    const next = pool.getNextKey();

    expect(next.apiKey).toBe("key-b");
  });

  it("allows a cooled-down key to be reused after cooldown expires", () => {
    vi.useFakeTimers();
    const pool = new ProviderKeyPool("OpenAI", ["key-a"]);
    const entry = pool.getNextKey();

    pool.reportFailure(entry);

    const cooldownUntil = pool.getSnapshot()[0].cooldownUntil;
    expect(cooldownUntil).not.toBeNull();
    vi.setSystemTime(new Date(cooldownUntil!.getTime() + 1));

    const next = pool.getNextKey();

    expect(next.apiKey).toBe("key-a");
  });
});
