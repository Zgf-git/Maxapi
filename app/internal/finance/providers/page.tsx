import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/internal/ui/empty-state";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listPaymentProviderInstances } from "@/lib/internal/finance";

export const metadata = {
  title: "Payment providers · Finance · Internal · MaxAPI"
};

export default async function InternalProvidersPage() {
  const instances = await listPaymentProviderInstances();

  const paypal = instances.filter((i) => i.provider === "PAYPAL");
  const alipay = instances.filter((i) => i.provider === "ALIPAY");
  const wechat = instances.filter((i) => i.provider === "WECHAT");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Payment providers"
        description={`${instances.length} configured instance(s)`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProviderSection title="PayPal" instances={paypal} />
        <ProviderSection title="Alipay" instances={alipay} />
        <ProviderSection title="WeChat Pay" instances={wechat} />
      </div>
    </div>
  );
}

function ProviderSection({
  title,
  instances
}: {
  title: string;
  instances: Awaited<ReturnType<typeof listPaymentProviderInstances>>;
}) {
  return (
    <SectionCard title={title}>
      {instances.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="No instances"
          description={`No ${title} provider instances configured.`}
        />
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <div
              key={instance.id}
              className="rounded-xl border border-white/8 bg-white/4 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{instance.label}</div>
                <StatusBadge status={instance.status} />
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <div>Priority: {instance.priority} · Refunds: {instance.supportsRefunds ? "Yes" : "No"}</div>
                {instance.minAmountUsdCents ? <div>Min: ${(instance.minAmountUsdCents / 100).toFixed(2)}</div> : null}
                {instance.maxAmountUsdCents ? <div>Max: ${(instance.maxAmountUsdCents / 100).toFixed(2)}</div> : null}
                {instance.dailyLimitUsdCents ? <div>Daily limit: ${(instance.dailyLimitUsdCents / 100).toFixed(2)}</div> : null}
              </div>
              <ConfigPreview provider={instance.provider} config={instance.config as Record<string, string>} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ConfigPreview({
  provider,
  config
}: {
  provider: string;
  config: Record<string, string>;
}) {
  const fields =
    provider === "PAYPAL"
      ? [
          { key: "clientId", label: "Client ID" },
          { key: "clientSecret", label: "Client Secret", secret: true },
          { key: "webhookId", label: "Webhook ID" }
        ]
      : provider === "ALIPAY"
        ? [
            { key: "appId", label: "App ID" },
            { key: "privateKey", label: "Private Key", secret: true },
            { key: "publicKey", label: "Public Key", secret: true },
            { key: "gatewayUrl", label: "Gateway URL" }
          ]
        : [
            { key: "appId", label: "App ID" },
            { key: "mchId", label: "Merchant ID" },
            { key: "apiV3Key", label: "API v3 Key", secret: true },
            { key: "privateKey", label: "Private Key", secret: true },
            { key: "certSerialNo", label: "Cert Serial" },
            { key: "platformPublicKey", label: "Platform Public Key", secret: true }
          ];

  return (
    <div className="mt-3 space-y-1.5 border-t border-white/6 pt-3">
      {fields.map((f) => {
        const value = config[f.key];
        if (!value) return null;
        return (
          <div key={f.key} className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{f.label}</span>
            <span className="font-mono text-slate-300">
              {f.secret ? maskSecret(value) : value.length > 40 ? `${value.slice(0, 40)}…` : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function maskSecret(value: string) {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
        active
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
          : "border-slate-300/20 bg-slate-300/10 text-slate-200"
      }`}
    >
      {status}
    </span>
  );
}
