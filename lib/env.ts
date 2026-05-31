import { z } from "zod";

const booleanishSchema = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }

    return value === "true" || value === "1" || value === "yes";
  });

const optionalStringSchema = z.preprocess((value) => {
  if (value === "") {
    return undefined;
  }

  return value;
}, z.string().min(1).optional());

const integerFromEnv = (defaultValue: string) =>
  z.preprocess(
    (value) => value ?? defaultValue,
    z.union([z.string(), z.number()]).transform((value) => Number.parseInt(String(value), 10)).pipe(z.number().int().positive())
  );

const numberFromEnv = (defaultValue: string) =>
  z.preprocess(
    (value) => value ?? defaultValue,
    z.union([z.string(), z.number()]).transform((value) => Number.parseFloat(String(value))).pipe(z.number().positive())
  );

const defaultedBooleanish = (defaultValue: "true" | "false") =>
  z.preprocess((value) => value ?? defaultValue, booleanishSchema);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_RUN_MODE: z.preprocess((value) => value ?? "saas", z.enum(["saas", "simple"])),
  AUTH_SECRET: z.string().min(16),
  AUTH_REQUIRE_EMAIL_VERIFICATION: defaultedBooleanish("true"),
  API_KEY_PEPPER: z.string().min(16),
  ENABLE_SELF_SIGNUP: booleanishSchema,
  MIN_REQUEST_BALANCE_USD_MICROS: z.preprocess((value) => value ?? "1", z.union([z.string(), z.number(), z.bigint()]).transform((value) => BigInt(value))),
  MAX_REQUEST_COST_USD_MICROS: z.preprocess((value) => value ?? "5000000", z.union([z.string(), z.number(), z.bigint()]).transform((value) => BigInt(value))),
  PREFLIGHT_DEFAULT_MAX_OUTPUT_TOKENS: integerFromEnv("4096"),
  OPENAI_API_KEY: optionalStringSchema,
  OPENAI_API_KEYS: z.preprocess((value) => {
    if (!value || value === "") {
      return undefined;
    }

    return String(value)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1)).optional()),
  OPENAI_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://api.openai.com/v1";
    }

    return value;
  }, z.string().url()),
  UPSTREAM_KEY_ENCRYPTION_KEY: optionalStringSchema,
  APIMART_API_KEY: optionalStringSchema,
  APIMART_API_KEYS: z.preprocess((value) => {
    if (!value || value === "") {
      return undefined;
    }

    return String(value)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1)).optional()),
  APIMART_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://api.apimart.ai/v1";
    }

    return value;
  }, z.string().url()),
  OPENROUTER_API_KEY: optionalStringSchema,
  OPENROUTER_API_KEYS: z.preprocess((value) => {
    if (!value || value === "") {
      return undefined;
    }

    return String(value)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1)).optional()),
  OPENROUTER_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://openrouter.ai/api/v1";
    }

    return value;
  }, z.string().url()),
  DEEPSEEK_API_KEY: optionalStringSchema,
  DEEPSEEK_API_KEYS: z.preprocess((value) => {
    if (!value || value === "") {
      return undefined;
    }

    return String(value)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1)).optional()),
  DEEPSEEK_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://api.deepseek.com/v1";
    }

    return value;
  }, z.string().url()),
  GOOGLE_API_KEY: optionalStringSchema,
  GOOGLE_API_KEYS: z.preprocess((value) => {
    if (!value || value === "") {
      return undefined;
    }

    return String(value)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, z.array(z.string().min(1)).optional()),
  GOOGLE_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://generativelanguage.googleapis.com/v1beta/openai";
    }

    return value;
  }, z.string().url()),
  UPSTASH_REDIS_REST_URL: z.preprocess((value) => {
    if (value === "") {
      return undefined;
    }

    return value;
  }, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalStringSchema,
  APP_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "http://localhost:3001";
    }

    return value;
  }, z.string().url()),
  PAYMENT_PUBLIC_BASE_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    return value;
  }, z.string().url().optional()),
  PAYMENT_CNY_RATE: numberFromEnv("7.2"),
  ROUTING_STICKY_TTL_SECONDS: integerFromEnv("3600"),
  UPSTREAM_PLATFORM_NAME: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "APIMart";
    }

    return value;
  }, z.string().min(1)),
  PAYPAL_CLIENT_ID: optionalStringSchema,
  PAYPAL_CLIENT_SECRET: optionalStringSchema,
  PAYPAL_WEBHOOK_ID: optionalStringSchema,
  PAYPAL_SANDBOX: defaultedBooleanish("false"),
  ALIPAY_APP_ID: optionalStringSchema,
  ALIPAY_PRIVATE_KEY: optionalStringSchema,
  ALIPAY_PUBLIC_KEY: optionalStringSchema,
  ALIPAY_GATEWAY_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return "https://openapi.alipay.com/gateway.do";
    }

    return value;
  }, z.string().url()),
  WECHAT_APP_ID: optionalStringSchema,
  WECHAT_MCH_ID: optionalStringSchema,
  WECHAT_API_V3_KEY: optionalStringSchema,
  WECHAT_PRIVATE_KEY: optionalStringSchema,
  WECHAT_CERT_SERIAL_NO: optionalStringSchema,
  WECHAT_PLATFORM_PUBLIC_KEY: optionalStringSchema,
  AUTH_EMAIL_FROM: optionalStringSchema,
  RESEND_API_KEY: optionalStringSchema,
  RATE_LIMIT_API_KEY_PER_MINUTE: integerFromEnv("60"),
  RATE_LIMIT_USER_PER_MINUTE: integerFromEnv("120"),
  RATE_LIMIT_IP_PER_MINUTE: integerFromEnv("300"),
  CONCURRENT_API_KEY_LIMIT: integerFromEnv("3"),
  CONCURRENT_USER_LIMIT: integerFromEnv("10"),
  RISK_ESCALATION_LIMIT_HITS: integerFromEnv("5"),
  RISK_MAX_REQUEST_BODY_CHARS: integerFromEnv("120000"),
  RISK_NEW_USER_AGE_HOURS: integerFromEnv("24"),
  RISK_NEW_USER_MAX_REQUEST_BODY_CHARS: integerFromEnv("12000"),
  ALERT_WEBHOOK_URL: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return undefined;
    }

    return value;
  }, z.string().url().optional()),
  ALERT_DEDUP_COOLDOWN_SECONDS: integerFromEnv("900"),
  ALERT_PENDING_USAGE_THRESHOLD: integerFromEnv("25"),
  INTERNAL_OPS_EMAILS: z.preprocess((value) => {
    if (value === "" || value === undefined) {
      return [];
    }

    if (typeof value !== "string") {
      return [];
    }

    return value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }, z.array(z.string().email()))
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_RUN_MODE: process.env.APP_RUN_MODE,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_REQUIRE_EMAIL_VERIFICATION: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION,
  API_KEY_PEPPER: process.env.API_KEY_PEPPER,
  ENABLE_SELF_SIGNUP: process.env.ENABLE_SELF_SIGNUP,
  MIN_REQUEST_BALANCE_USD_MICROS: process.env.MIN_REQUEST_BALANCE_USD_MICROS,
  MAX_REQUEST_COST_USD_MICROS: process.env.MAX_REQUEST_COST_USD_MICROS,
  PREFLIGHT_DEFAULT_MAX_OUTPUT_TOKENS: process.env.PREFLIGHT_DEFAULT_MAX_OUTPUT_TOKENS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_API_KEYS: process.env.OPENAI_API_KEYS,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  UPSTREAM_KEY_ENCRYPTION_KEY: process.env.UPSTREAM_KEY_ENCRYPTION_KEY,
  APIMART_API_KEY: process.env.APIMART_API_KEY,
  APIMART_API_KEYS: process.env.APIMART_API_KEYS,
  APIMART_BASE_URL: process.env.APIMART_BASE_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_API_KEYS: process.env.OPENROUTER_API_KEYS,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_KEYS: process.env.DEEPSEEK_API_KEYS,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_API_KEYS: process.env.GOOGLE_API_KEYS,
  GOOGLE_BASE_URL: process.env.GOOGLE_BASE_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  APP_BASE_URL: process.env.APP_BASE_URL,
  PAYMENT_PUBLIC_BASE_URL: process.env.PAYMENT_PUBLIC_BASE_URL,
  PAYMENT_CNY_RATE: process.env.PAYMENT_CNY_RATE,
  ROUTING_STICKY_TTL_SECONDS: process.env.ROUTING_STICKY_TTL_SECONDS,
  UPSTREAM_PLATFORM_NAME: process.env.UPSTREAM_PLATFORM_NAME,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
  PAYPAL_SANDBOX: process.env.PAYPAL_SANDBOX,
  ALIPAY_APP_ID: process.env.ALIPAY_APP_ID,
  ALIPAY_PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY,
  ALIPAY_PUBLIC_KEY: process.env.ALIPAY_PUBLIC_KEY,
  ALIPAY_GATEWAY_URL: process.env.ALIPAY_GATEWAY_URL,
  WECHAT_APP_ID: process.env.WECHAT_APP_ID,
  WECHAT_MCH_ID: process.env.WECHAT_MCH_ID,
  WECHAT_API_V3_KEY: process.env.WECHAT_API_V3_KEY,
  WECHAT_PRIVATE_KEY: process.env.WECHAT_PRIVATE_KEY,
  WECHAT_CERT_SERIAL_NO: process.env.WECHAT_CERT_SERIAL_NO,
  WECHAT_PLATFORM_PUBLIC_KEY: process.env.WECHAT_PLATFORM_PUBLIC_KEY,
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RATE_LIMIT_API_KEY_PER_MINUTE: process.env.RATE_LIMIT_API_KEY_PER_MINUTE,
  RATE_LIMIT_USER_PER_MINUTE: process.env.RATE_LIMIT_USER_PER_MINUTE,
  RATE_LIMIT_IP_PER_MINUTE: process.env.RATE_LIMIT_IP_PER_MINUTE,
  CONCURRENT_API_KEY_LIMIT: process.env.CONCURRENT_API_KEY_LIMIT,
  CONCURRENT_USER_LIMIT: process.env.CONCURRENT_USER_LIMIT,
  RISK_ESCALATION_LIMIT_HITS: process.env.RISK_ESCALATION_LIMIT_HITS,
  RISK_MAX_REQUEST_BODY_CHARS: process.env.RISK_MAX_REQUEST_BODY_CHARS,
  RISK_NEW_USER_AGE_HOURS: process.env.RISK_NEW_USER_AGE_HOURS,
  RISK_NEW_USER_MAX_REQUEST_BODY_CHARS: process.env.RISK_NEW_USER_MAX_REQUEST_BODY_CHARS,
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
  ALERT_DEDUP_COOLDOWN_SECONDS: process.env.ALERT_DEDUP_COOLDOWN_SECONDS,
  ALERT_PENDING_USAGE_THRESHOLD: process.env.ALERT_PENDING_USAGE_THRESHOLD,
  INTERNAL_OPS_EMAILS: process.env.INTERNAL_OPS_EMAILS
});
