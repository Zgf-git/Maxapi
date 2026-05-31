import { ApiRouteError } from "@/lib/chat/errors";
import type { ChatCompletionRequestInput } from "@/lib/providers/types";
import { getStickyRouteBinding } from "@/lib/routing/sticky";
import { getProviderForModel } from "@/lib/routing/config";
import { getRuntimeTargetsForRoutePolicy } from "@/lib/routing/runtime";
import type { RouteDecision } from "@/lib/routing/types";
import { getPricingRule } from "@/lib/pricing";
import type { RouteTarget } from "@/lib/routing/types";

function routeTargetCostScore(target: RouteTarget) {
  const pricing = getPricingRule(target.provider, target.model);

  return pricing.inputStandardUsdMicrosPerMillion + pricing.outputUsdMicrosPerMillion;
}

function applyRoutingStrategy(targets: RouteTarget[], input: ChatCompletionRequestInput) {
  if (input.routing_strategy !== "cost") {
    return targets;
  }

  return targets.slice().sort((a, b) => {
    const costDiff = routeTargetCostScore(a) - routeTargetCostScore(b);

    if (costDiff === 0n) {
      return 0;
    }

    return costDiff < 0n ? -1 : 1;
  });
}

export async function resolveChatRoute(
  input: ChatCompletionRequestInput,
  context?: { apiKeyId: string }
): Promise<RouteDecision> {
  const requestedModel = input.model ?? null;
  const requestedRoutePolicy = input.route_policy ?? null;

  if (requestedRoutePolicy) {
    const targets = applyRoutingStrategy(await getRuntimeTargetsForRoutePolicy(requestedRoutePolicy), input);
    let primary = targets[0];
    let fallbacks = targets.slice(1);
    let routeReason =
      input.routing_strategy === "cost"
        ? `route_policy:${requestedRoutePolicy}:cost_strategy`
        : `route_policy:${requestedRoutePolicy}`;

    if (context?.apiKeyId && input.session_id) {
      const stickyBinding = await getStickyRouteBinding({
        apiKeyId: context.apiKeyId,
        sessionId: input.session_id,
        routePolicy: requestedRoutePolicy
      });

      if (stickyBinding) {
        const stickyTarget = targets.find(
          (target) =>
            target.provider === stickyBinding.provider && target.model === stickyBinding.model
        );

        if (stickyTarget) {
          primary = stickyTarget;
          fallbacks = targets.filter(
            (target) =>
              !(target.provider === stickyTarget.provider && target.model === stickyTarget.model)
          );
          routeReason = `route_policy:${requestedRoutePolicy}:sticky_session`;
        }
      }
    }

    if (!primary) {
      throw new ApiRouteError(503, "no_route_target", `No configured provider available for route policy: ${requestedRoutePolicy}.`);
    }

    return {
      requestedModel,
      requestedRoutePolicy,
      selectedProvider: primary.provider,
      selectedModel: primary.model,
      fallbackProvider: fallbacks[0]?.provider ?? null,
      fallbackModel: fallbacks[0]?.model ?? null,
      fallbackChain: fallbacks,
      routeReason,
      usedFallback: false
    };
  }

  if (!requestedModel) {
    throw new ApiRouteError(400, "invalid_request", "Either model or route_policy must be provided.");
  }

  const provider = getProviderForModel(requestedModel);

  if (!provider) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${requestedModel}.`, "unsupported_model");
  }

  return {
    requestedModel,
    requestedRoutePolicy,
    selectedProvider: provider,
    selectedModel: requestedModel,
    fallbackProvider: null,
    fallbackModel: null,
    fallbackChain: [],
    routeReason: "explicit_model",
    usedFallback: false
  };
}
