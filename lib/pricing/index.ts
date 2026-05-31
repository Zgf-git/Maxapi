import type { ProviderName } from "@/lib/providers/types";
import { getAPIMartPricingRule } from "@/lib/pricing/apimart";
import { getDeepSeekPricingRule } from "@/lib/pricing/deepseek";
import { getGooglePricingRule } from "@/lib/pricing/google";
import { getOpenAIPricingRule } from "@/lib/pricing/openai";
import { getOpenRouterPricingRule } from "@/lib/pricing/openrouter";
import type { PricingRule } from "@/lib/pricing/types";

const PRICING_RULE_RESOLVERS: Record<ProviderName, (model: string) => PricingRule> = {
  openai: getOpenAIPricingRule,
  apimart: getAPIMartPricingRule,
  openrouter: getOpenRouterPricingRule,
  deepseek: getDeepSeekPricingRule,
  google: getGooglePricingRule
};

export function getPricingRule(provider: ProviderName, model: string) {
  return PRICING_RULE_RESOLVERS[provider](model);
}
