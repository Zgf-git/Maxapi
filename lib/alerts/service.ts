import { env } from "@/lib/env";

declare global {
  var maxapiAlertDedupCache: Map<string, number> | undefined;
}

function getAlertCache() {
  if (!global.maxapiAlertDedupCache) {
    global.maxapiAlertDedupCache = new Map();
  }

  return global.maxapiAlertDedupCache;
}

export async function sendOperatorAlert(input: {
  title: string;
  severity: "warning" | "critical";
  source: string;
  details: Record<string, unknown>;
}) {
  if (!env.ALERT_WEBHOOK_URL) {
    return { ok: false as const, skipped: true as const };
  }

  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: input.title,
        severity: input.severity,
        source: input.source,
        details: input.details,
        timestamp: new Date().toISOString()
      }),
      cache: "no-store"
    });

    return { ok: true as const };
  } catch {
    return { ok: false as const, skipped: false as const };
  }
}

export async function sendDedupedOperatorAlert(input: {
  dedupKey: string;
  title: string;
  severity: "warning" | "critical";
  source: string;
  details: Record<string, unknown>;
  cooldownSeconds?: number;
}) {
  const cache = getAlertCache();
  const now = Date.now();
  const cooldownMs = (input.cooldownSeconds ?? env.ALERT_DEDUP_COOLDOWN_SECONDS) * 1000;
  const lastSentAt = cache.get(input.dedupKey) ?? 0;

  if (lastSentAt > 0 && now - lastSentAt < cooldownMs) {
    return { ok: false as const, skipped: true as const, deduped: true as const };
  }

  const result = await sendOperatorAlert({
    title: input.title,
    severity: input.severity,
    source: input.source,
    details: input.details
  });

  if (result.ok) {
    cache.set(input.dedupKey, now);
  }

  return result;
}
