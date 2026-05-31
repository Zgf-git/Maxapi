import { PaymentProvider, PaymentProviderInstanceStatus, TopUpPurchaseStatus } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const payPalConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  webhookId: z.string().min(1).optional()
});

const alipayConfigSchema = z.object({
  appId: z.string().min(1),
  privateKey: z.string().min(1),
  publicKey: z.string().min(1),
  gatewayUrl: z.string().url().optional()
});

const wechatConfigSchema = z.object({
  appId: z.string().min(1),
  mchId: z.string().min(1),
  apiV3Key: z.string().min(1),
  privateKey: z.string().min(1),
  certSerialNo: z.string().min(1),
  platformPublicKey: z.string().min(1)
});

export type PayPalRuntimeConfig = z.infer<typeof payPalConfigSchema>;
export type AlipayRuntimeConfig = z.infer<typeof alipayConfigSchema>;
export type WeChatRuntimeConfig = z.infer<typeof wechatConfigSchema>;

export type PaymentProviderRuntime =
  | {
      provider: "PAYPAL";
      source: "database" | "env";
      instanceId: string | null;
      label: string;
      config: PayPalRuntimeConfig;
    }
  | {
      provider: "ALIPAY";
      source: "database" | "env";
      instanceId: string | null;
      label: string;
      config: AlipayRuntimeConfig;
    }
  | {
      provider: "WECHAT";
      source: "database" | "env";
      instanceId: string | null;
      label: string;
      config: WeChatRuntimeConfig;
    };

export function parsePaymentProviderRuntimeConfig(provider: PaymentProvider, config: unknown) {
  switch (provider) {
    case PaymentProvider.PAYPAL:
      return payPalConfigSchema.parse(config);
    case PaymentProvider.ALIPAY:
      return alipayConfigSchema.parse(config);
    case PaymentProvider.WECHAT:
      return wechatConfigSchema.parse(config);
  }
}

async function instanceWithinDailyLimit(instanceId: string, dailyLimitUsdCents: number | null, amountUsdCents: number) {
  if (!dailyLimitUsdCents) {
    return true;
  }

  const windowStart = new Date();
  windowStart.setUTCHours(0, 0, 0, 0);

  const aggregate = await db.topUpPurchase.aggregate({
    where: {
      paymentProviderInstanceId: instanceId,
      status: TopUpPurchaseStatus.CREDITED,
      createdAt: {
        gte: windowStart
      }
    },
    _sum: {
      amountUsdCents: true
    }
  });

  const usedToday = aggregate._sum.amountUsdCents ?? 0;
  return usedToday + amountUsdCents <= dailyLimitUsdCents;
}

function envFallbackRuntime(provider: PaymentProvider): PaymentProviderRuntime | null {
  switch (provider) {
    case PaymentProvider.PAYPAL:
      if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        return null;
      }
      return {
        provider,
        source: "env",
        instanceId: null,
        label: "Environment PayPal",
        config: {
          clientId: env.PAYPAL_CLIENT_ID,
          clientSecret: env.PAYPAL_CLIENT_SECRET,
          webhookId: env.PAYPAL_WEBHOOK_ID ?? undefined
        }
      };
    case PaymentProvider.ALIPAY:
      if (!env.ALIPAY_APP_ID || !env.ALIPAY_PRIVATE_KEY || !env.ALIPAY_PUBLIC_KEY) {
        return null;
      }
      return {
        provider,
        source: "env",
        instanceId: null,
        label: "Environment Alipay",
        config: {
          appId: env.ALIPAY_APP_ID,
          privateKey: env.ALIPAY_PRIVATE_KEY,
          publicKey: env.ALIPAY_PUBLIC_KEY,
          gatewayUrl: env.ALIPAY_GATEWAY_URL
        }
      };
    case PaymentProvider.WECHAT:
      if (
        !env.WECHAT_APP_ID ||
        !env.WECHAT_MCH_ID ||
        !env.WECHAT_API_V3_KEY ||
        !env.WECHAT_PRIVATE_KEY ||
        !env.WECHAT_CERT_SERIAL_NO ||
        !env.WECHAT_PLATFORM_PUBLIC_KEY
      ) {
        return null;
      }
      return {
        provider,
        source: "env",
        instanceId: null,
        label: "Environment WeChat",
        config: {
          appId: env.WECHAT_APP_ID,
          mchId: env.WECHAT_MCH_ID,
          apiV3Key: env.WECHAT_API_V3_KEY,
          privateKey: env.WECHAT_PRIVATE_KEY,
          certSerialNo: env.WECHAT_CERT_SERIAL_NO,
          platformPublicKey: env.WECHAT_PLATFORM_PUBLIC_KEY
        }
      };
  }
}

export async function getActivePaymentProviderRuntime(provider: PaymentProvider) {
  const instance = await db.paymentProviderInstance.findFirst({
    where: {
      provider,
      status: "ACTIVE"
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });

  if (instance) {
    return {
      provider,
      source: "database" as const,
      instanceId: instance.id,
      label: instance.label,
      config: parsePaymentProviderRuntimeConfig(provider, instance.config)
    } as PaymentProviderRuntime;
  }

  return envFallbackRuntime(provider);
}

export async function selectPaymentProviderRuntime(provider: PaymentProvider, amountUsdCents: number) {
  const instances = await db.paymentProviderInstance.findMany({
    where: {
      provider,
      status: PaymentProviderInstanceStatus.ACTIVE
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });

  for (const instance of instances) {
    if (instance.minAmountUsdCents !== null && amountUsdCents < instance.minAmountUsdCents) {
      continue;
    }

    if (instance.maxAmountUsdCents !== null && amountUsdCents > instance.maxAmountUsdCents) {
      continue;
    }

    if (!(await instanceWithinDailyLimit(instance.id, instance.dailyLimitUsdCents, amountUsdCents))) {
      continue;
    }

    return {
      provider,
      source: "database" as const,
      instanceId: instance.id,
      label: instance.label,
      config: parsePaymentProviderRuntimeConfig(provider, instance.config)
    } as PaymentProviderRuntime;
  }

  return envFallbackRuntime(provider);
}

export async function selectPayPalRuntime(amountUsdCents: number) {
  const runtime = await selectPaymentProviderRuntime(PaymentProvider.PAYPAL, amountUsdCents);
  return runtime && runtime.provider === "PAYPAL" ? runtime : null;
}

export async function selectAlipayRuntime(amountUsdCents: number) {
  const runtime = await selectPaymentProviderRuntime(PaymentProvider.ALIPAY, amountUsdCents);
  return runtime && runtime.provider === "ALIPAY" ? runtime : null;
}

export async function selectWeChatRuntime(amountUsdCents: number) {
  const runtime = await selectPaymentProviderRuntime(PaymentProvider.WECHAT, amountUsdCents);
  return runtime && runtime.provider === "WECHAT" ? runtime : null;
}

export async function getActivePayPalRuntime() {
  const runtime = await getActivePaymentProviderRuntime(PaymentProvider.PAYPAL);
  return runtime && runtime.provider === "PAYPAL" ? runtime : null;
}

export async function getActiveAlipayRuntime() {
  const runtime = await getActivePaymentProviderRuntime(PaymentProvider.ALIPAY);
  return runtime && runtime.provider === "ALIPAY" ? runtime : null;
}

export async function getActiveWeChatRuntime() {
  const runtime = await getActivePaymentProviderRuntime(PaymentProvider.WECHAT);
  return runtime && runtime.provider === "WECHAT" ? runtime : null;
}

export async function listPaymentProviderInstances() {
  return db.paymentProviderInstance.findMany({
    orderBy: [{ provider: "asc" }, { priority: "asc" }, { createdAt: "asc" }]
  });
}

export async function createPaymentProviderInstance(input: {
  actorUserId: string;
  provider: PaymentProvider;
  label: string;
  priority: number;
  supportsRefunds: boolean;
  minAmountUsdCents?: number | null;
  maxAmountUsdCents?: number | null;
  dailyLimitUsdCents?: number | null;
  config: unknown;
}) {
  const config = parsePaymentProviderRuntimeConfig(input.provider, input.config);
  const record = await db.paymentProviderInstance.create({
    data: {
      provider: input.provider,
      label: input.label,
      priority: input.priority,
      supportsRefunds: input.supportsRefunds,
      minAmountUsdCents: input.minAmountUsdCents ?? null,
      maxAmountUsdCents: input.maxAmountUsdCents ?? null,
      dailyLimitUsdCents: input.dailyLimitUsdCents ?? null,
      config
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "payment.instance.create",
    resourceType: "payment_provider_instance",
    resourceId: record.id,
    metadata: {
      provider: record.provider,
      label: record.label,
      priority: record.priority,
      supportsRefunds: record.supportsRefunds
    }
  });

  return record;
}

export async function updatePaymentProviderInstance(input: {
  actorUserId: string;
  instanceId: string;
  label: string;
  priority: number;
  supportsRefunds: boolean;
  minAmountUsdCents?: number | null;
  maxAmountUsdCents?: number | null;
  dailyLimitUsdCents?: number | null;
  config: unknown;
}) {
  const existing = await db.paymentProviderInstance.findUnique({
    where: { id: input.instanceId }
  });

  if (!existing) {
    throw new Error("Payment provider instance not found.");
  }

  const config = parsePaymentProviderRuntimeConfig(existing.provider, input.config);
  const record = await db.paymentProviderInstance.update({
    where: { id: input.instanceId },
    data: {
      label: input.label,
      priority: input.priority,
      supportsRefunds: input.supportsRefunds,
      minAmountUsdCents: input.minAmountUsdCents ?? null,
      maxAmountUsdCents: input.maxAmountUsdCents ?? null,
      dailyLimitUsdCents: input.dailyLimitUsdCents ?? null,
      config
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "payment.instance.update",
    resourceType: "payment_provider_instance",
    resourceId: record.id,
    metadata: {
      before: {
        label: existing.label,
        priority: existing.priority,
        supportsRefunds: existing.supportsRefunds,
        minAmountUsdCents: existing.minAmountUsdCents,
        maxAmountUsdCents: existing.maxAmountUsdCents,
        dailyLimitUsdCents: existing.dailyLimitUsdCents
      },
      after: {
        label: record.label,
        priority: record.priority,
        supportsRefunds: record.supportsRefunds,
        minAmountUsdCents: record.minAmountUsdCents,
        maxAmountUsdCents: record.maxAmountUsdCents,
        dailyLimitUsdCents: record.dailyLimitUsdCents
      }
    }
  });

  return record;
}

export async function setPaymentProviderInstanceStatus(input: {
  actorUserId: string;
  instanceId: string;
  status: PaymentProviderInstanceStatus;
}) {
  const existing = await db.paymentProviderInstance.findUnique({
    where: { id: input.instanceId }
  });

  if (!existing) {
    throw new Error("Payment provider instance not found.");
  }

  const record = await db.paymentProviderInstance.update({
    where: { id: input.instanceId },
    data: {
      status: input.status
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    action: "payment.instance.status",
    resourceType: "payment_provider_instance",
    resourceId: record.id,
    metadata: {
      beforeStatus: existing.status,
      afterStatus: record.status
    }
  });

  return record;
}
