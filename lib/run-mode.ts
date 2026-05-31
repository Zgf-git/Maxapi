import { env } from "@/lib/env";

export type AppRunMode = "saas" | "simple";

export function getAppRunMode(): AppRunMode {
  return env.APP_RUN_MODE;
}

export function isSimpleMode() {
  return getAppRunMode() === "simple";
}

export function isSaasMode() {
  return getAppRunMode() === "saas";
}

export function canSelfSignup() {
  return isSaasMode() && env.ENABLE_SELF_SIGNUP;
}

export function canUseBilling() {
  return isSaasMode();
}

export function canUseReferral() {
  return isSaasMode();
}

export function canShowPublicPricing() {
  return isSaasMode();
}

export function canShowCommercialNavigation() {
  return isSaasMode();
}
