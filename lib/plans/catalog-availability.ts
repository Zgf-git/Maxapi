import type { PlanTier } from "@prisma/client";

import { getCatalogPolicyEntries, getPublicCatalogModels } from "@/lib/catalog";
import { getPlanCatalogEntry } from "@/lib/plans/catalog";

export function getAvailableCatalogForPlan(plan: PlanTier | null | undefined) {
  const planEntry = getPlanCatalogEntry(plan);
  const models = getPublicCatalogModels().filter((model) => planEntry.allowedModels.includes(model.id));
  const policies = getCatalogPolicyEntries().filter((policy) =>
    planEntry.allowedRoutePolicies.includes(policy.routePolicy)
  );

  return {
    models,
    policies,
    defaultModelId: models.find((model) => model.isDefault)?.id ?? models[0]?.id ?? "gpt-5.4",
    defaultRoutePolicy: policies.find((policy) => policy.routePolicy === "auto")?.routePolicy ?? policies[0]?.routePolicy ?? "auto"
  };
}
