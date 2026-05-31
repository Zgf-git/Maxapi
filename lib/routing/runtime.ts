import { RoutePolicyConfigStatus } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/service";
import { getCatalogExplicitModels } from "@/lib/catalog";
import { db } from "@/lib/db";
import { listProviderDefinitions } from "@/lib/providers/catalog";
import type { ProviderName } from "@/lib/providers/types";
import { getStaticTargetsForRoutePolicy } from "@/lib/routing/config";
import type { RouteTarget } from "@/lib/routing/types";
import type { RoutePolicy } from "@/lib/providers/types";

const knownProviderSlugs = new Set<ProviderName>(listProviderDefinitions().map(({ slug }) => slug));
const knownChatTargetPairs = new Set(
  getCatalogExplicitModels()
    .filter((entry) => entry.category === "chat")
    .map((entry) => `${entry.provider}:${entry.upstreamModel}`)
);

const routeTargetSchema = z.object({
  provider: z.string().min(1).refine((value): value is ProviderName => knownProviderSlugs.has(value as ProviderName), {
    message: "Unknown provider slug."
  }).transform((value) => value as ProviderName),
  model: z.string().min(1)
}).superRefine((value, ctx) => {
  if (!knownChatTargetPairs.has(`${value.provider}:${value.model}`)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unknown provider/model route target."
    });
  }
});

export const routeTargetsSchema = z.array(routeTargetSchema).min(1);

export async function listRoutePolicyConfigs() {
  return db.routePolicyConfig.findMany({
    orderBy: [{ routePolicy: "asc" }, { updatedAt: "desc" }]
  });
}

export async function getRuntimeTargetsForRoutePolicy(routePolicy: RoutePolicy): Promise<RouteTarget[]> {
  const config = await db.routePolicyConfig.findFirst({
    where: {
      routePolicy,
      status: RoutePolicyConfigStatus.ACTIVE
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (config) {
    return routeTargetsSchema.parse(config.targets);
  }

  return getStaticTargetsForRoutePolicy(routePolicy);
}

export async function upsertRoutePolicyConfig(input: {
  actorUserId: string;
  routePolicy: RoutePolicy;
  status: RoutePolicyConfigStatus;
  targets: unknown;
}) {
  const normalizedTargets = routeTargetsSchema.parse(input.targets);
  const existing = await db.routePolicyConfig.findUnique({
    where: { routePolicy: input.routePolicy }
  });

  const record = await db.routePolicyConfig.upsert({
    where: { routePolicy: input.routePolicy },
    create: {
      routePolicy: input.routePolicy,
      status: input.status,
      targets: normalizedTargets
    },
    update: {
      status: input.status,
      targets: normalizedTargets
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "routing.policy.upsert",
    resourceType: "route_policy_config",
    resourceId: record.id,
    metadata: {
      routePolicy: record.routePolicy,
      before: existing
        ? {
            status: existing.status,
            targets: existing.targets
          }
        : null,
      after: {
        status: record.status,
        targets: record.targets
      }
    }
  });

  return record;
}

export async function setRoutePolicyConfigStatus(input: {
  actorUserId: string;
  routePolicy: RoutePolicy;
  status: RoutePolicyConfigStatus;
}) {
  const existing = await db.routePolicyConfig.findUnique({
    where: { routePolicy: input.routePolicy }
  });

  if (!existing) {
    throw new Error("Route policy config not found.");
  }

  const record = await db.routePolicyConfig.update({
    where: { routePolicy: input.routePolicy },
    data: { status: input.status }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "routing.policy.status",
    resourceType: "route_policy_config",
    resourceId: record.id,
    metadata: {
      routePolicy: record.routePolicy,
      beforeStatus: existing.status,
      afterStatus: record.status
    }
  });

  return record;
}
