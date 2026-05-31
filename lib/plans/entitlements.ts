import { PlanTier } from "@prisma/client";

import { ApiRouteError } from "@/lib/chat/errors";
import { db } from "@/lib/db";
import { DEFAULT_PLAN, getPlanCatalogEntry } from "@/lib/plans/catalog";
import type { RoutePolicy } from "@/lib/providers/types";

export type ChatEntitlementResult = {
  plan: PlanTier;
};

function normalizePlan(plan: PlanTier | null | undefined) {
  return plan ?? DEFAULT_PLAN;
}

export function checkChatEntitlement(
  plan: PlanTier | null | undefined,
  input: { model?: string | null; route_policy?: RoutePolicy | null }
) {
  const planEntry = getPlanCatalogEntry(normalizePlan(plan));

  if (input.model) {
    if (!planEntry.allowedModels.includes(input.model)) {
      throw new ApiRouteError(
        403,
        "model_not_allowed",
        `${input.model} is not available on the ${planEntry.label} plan.`
      );
    }

    return;
  }

  const routePolicy = input.route_policy;

  if (routePolicy && !planEntry.allowedRoutePolicies.includes(routePolicy as RoutePolicy)) {
    throw new ApiRouteError(
      403,
      "route_policy_not_allowed",
      `${routePolicy} routing is not available on the ${planEntry.label} plan.`
    );
  }
}

export async function assertChatEntitlement(
  userId: string,
  input: { model?: string | null; route_policy?: RoutePolicy | null }
): Promise<ChatEntitlementResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true }
  });

  if (!user) {
    throw new ApiRouteError(401, "unauthorized", "Authentication is required.");
  }

  const plan = normalizePlan(user.plan);
  checkChatEntitlement(plan, input);

  return { plan };
}
