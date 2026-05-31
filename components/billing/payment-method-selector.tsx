"use client";

import { PaymentProvider } from "@prisma/client";
import { CreditCard, Landmark, Wallet } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import type { PublicPaymentProvider } from "@/lib/payments/providers";
import type { TopUpPackage } from "@/lib/payments/topup-packages";
import { cn, formatUsdMicros } from "@/lib/utils";

import { Button } from "@/components/ui/button";

const providerIcons = {
  [PaymentProvider.PAYPAL]: CreditCard,
  [PaymentProvider.ALIPAY]: Wallet,
  [PaymentProvider.WECHAT]: Landmark
};

export function PaymentMethodSelector({
  providers,
  topUpPackages
}: {
  providers: PublicPaymentProvider[];
  topUpPackages: TopUpPackage[];
}) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(topUpPackages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<PaymentProvider | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPackage = useMemo(
    () => topUpPackages.find((item) => item.id === selectedPackageId) ?? null,
    [selectedPackageId, topUpPackages]
  );

  function startCheckout(provider: PaymentProvider, configured: boolean) {
    if (!selectedPackage) {
      setError("Please choose a top-up package first.");
      return;
    }

    if (!configured) {
      setError("This payment method is not configured yet.");
      return;
    }

    setError(null);
    setPendingProvider(provider);

    startTransition(async () => {
      const response = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          provider
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.url) {
        setPendingProvider(null);
        setError(payload?.error?.message ?? "Could not start the selected payment flow.");
        return;
      }

      window.location.assign(payload.url);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-200">选择充值套餐</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {topUpPackages.map((item) => (
            <button
              className={cn(
                "rounded-3xl border p-4 text-left transition",
                selectedPackageId === item.id
                  ? "border-cyan-300/28 bg-[linear-gradient(135deg,rgba(91,231,196,0.12),rgba(112,164,255,0.14))] shadow-[0_14px_40px_rgba(3,8,18,0.28)]"
                  : "border-white/8 bg-white/[0.045] hover:border-white/14 hover:bg-white/[0.06]"
              )}
              key={item.id}
              onClick={() => setSelectedPackageId(item.id)}
              type="button"
            >
              <p className="font-medium text-slate-100">{item.label}</p>
              <p className="mt-1 text-sm text-slate-400">{item.description}</p>
              <p className="mt-3 text-sm font-medium text-cyan-100">{formatUsdMicros(item.creditsUsdMicros)}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-200">选择支付方式</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {providers.map((provider) => {
            const Icon = providerIcons[provider.id];
            const active = provider.configured;
            const isOpening = isPending && pendingProvider === provider.id;

            return (
              <div
                className={cn(
                  "rounded-3xl border p-4",
                  active
                    ? "border-white/8 bg-white/[0.045]"
                    : "border-white/6 bg-white/[0.02] opacity-70"
                )}
                key={provider.id}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3 text-slate-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100">{provider.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{provider.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {active ? "已配置，可发起支付" : "尚未配置，先补商户参数"}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={!active || !selectedPackage || isPending}
                  onClick={() => startCheckout(provider.id, provider.configured)}
                  type="button"
                  variant={active ? "secondary" : "outline"}
                >
                  {isOpening ? "Opening..." : `使用${provider.label}支付`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}
    </div>
  );
}
