import { PaymentProvider } from "@prisma/client";

import { getActivePaymentProviderRuntime } from "@/lib/payments/provider-instances";

export type PublicPaymentProvider = {
  id: PaymentProvider;
  label: string;
  description: string;
  configured: boolean;
};

export const PAYMENT_PROVIDER_META: Record<PaymentProvider, Omit<PublicPaymentProvider, "configured">> = {
  PAYPAL: {
    id: PaymentProvider.PAYPAL,
    label: "PayPal",
    description: "Use PayPal Checkout for international card and wallet payments."
  },
  ALIPAY: {
    id: PaymentProvider.ALIPAY,
    label: "支付宝",
    description: "通过支付宝电脑网站支付完成充值。"
  },
  WECHAT: {
    id: PaymentProvider.WECHAT,
    label: "微信",
    description: "通过微信 Native 支付完成充值。"
  }
};

export async function isPaymentProviderConfigured(provider: PaymentProvider) {
  return Boolean(await getActivePaymentProviderRuntime(provider));
}

export async function listPublicPaymentProviders(): Promise<PublicPaymentProvider[]> {
  const providers = await Promise.all(
    Object.values(PaymentProvider).map(async (provider) => ({
      ...PAYMENT_PROVIDER_META[provider],
      configured: await isPaymentProviderConfigured(provider)
    }))
  );

  return providers;
}
