import { createHash } from "crypto";

import { RiskState } from "@prisma/client";

import { sendOperatorAlert } from "@/lib/alerts/service";
import { sanitizeErrorMessage } from "@/lib/chat/errors";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const ESCALATION_WINDOW_MS = 10 * 60 * 1000;

export type AbuseEventInput = {
  userId?: string | null;
  apiKeyId?: string | null;
  ipAddress?: string | null;
  eventType: string;
  severity: "info" | "warning" | "critical";
  routePolicy?: string | null;
  requestedModel?: string | null;
  actualProvider?: string | null;
  status: "blocked" | "observed" | "escalated";
  reasonCode: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function hashIpAddress(ipAddress: string | null | undefined) {
  if (!ipAddress) {
    return null;
  }

  return createHash("sha256").update(ipAddress).digest("hex");
}

function sanitizeMetadata(metadata: AbuseEventInput["metadata"]) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizeErrorMessage(value) : value
    ])
  );
}

export async function recordAbuseEvent(input: AbuseEventInput) {
  const event = await db.abuseEvent.create({
    data: {
      userId: input.userId ?? null,
      apiKeyId: input.apiKeyId ?? null,
      ipAddressHash: hashIpAddress(input.ipAddress),
      eventType: input.eventType,
      severity: input.severity,
      routePolicy: input.routePolicy ?? null,
      requestedModel: input.requestedModel ?? null,
      actualProvider: input.actualProvider ?? null,
      status: input.status,
      reasonCode: input.reasonCode,
      metadata: sanitizeMetadata(input.metadata)
    }
  });

  if (input.eventType === "rate_limit_hit" || input.eventType === "concurrent_limit_hit") {
    await maybeEscalateRateLimitedState(input.userId ?? null, input.apiKeyId ?? null);
  }

  if (input.severity === "critical" || input.status === "escalated") {
    await sendOperatorAlert({
      title: `Risk event: ${input.reasonCode}`,
      severity: input.severity === "critical" ? "critical" : "warning",
      source: "risk.events",
      details: {
        eventType: input.eventType,
        status: input.status,
        reasonCode: input.reasonCode,
        userId: input.userId ?? null,
        apiKeyId: input.apiKeyId ?? null,
        requestedModel: input.requestedModel ?? null,
        routePolicy: input.routePolicy ?? null
      }
    });
  }

  return event;
}

async function maybeEscalateRateLimitedState(userId: string | null, apiKeyId: string | null) {
  const createdAt = {
    gte: new Date(Date.now() - ESCALATION_WINDOW_MS)
  };
  const baseWhere = {
    createdAt,
    eventType: {
      in: ["rate_limit_hit", "concurrent_limit_hit"]
    }
  };

  if (apiKeyId) {
    const apiKeyHits = await db.abuseEvent.count({
      where: {
        ...baseWhere,
        apiKeyId
      }
    });

    if (apiKeyHits >= env.RISK_ESCALATION_LIMIT_HITS) {
      await db.apiKey.updateMany({
        where: {
          id: apiKeyId,
          riskState: RiskState.NORMAL
        },
        data: {
          riskState: RiskState.RATE_LIMITED
        }
      });
    }
  }

  if (userId) {
    const userHits = await db.abuseEvent.count({
      where: {
        ...baseWhere,
        userId
      }
    });

    if (userHits >= env.RISK_ESCALATION_LIMIT_HITS) {
      await db.user.updateMany({
        where: {
          id: userId,
          riskState: RiskState.NORMAL
        },
        data: {
          riskState: RiskState.RATE_LIMITED
        }
      });
    }
  }
}
