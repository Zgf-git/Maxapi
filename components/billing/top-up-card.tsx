import { DeveloperCreditButton } from "@/components/billing/developer-credit-button";
import { PaymentMethodSelector } from "@/components/billing/payment-method-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicPaymentProvider } from "@/lib/payments/providers";
import type { TopUpPackage } from "@/lib/payments/topup-packages";
import { formatUsdMicros } from "@/lib/utils";

export function TopUpCard({
  canGrantDeveloperCredit,
  developerCreditUsdMicros,
  paymentProviders,
  topUpPackages
}: {
  canGrantDeveloperCredit: boolean;
  developerCreditUsdMicros: bigint;
  paymentProviders: PublicPaymentProvider[];
  topUpPackages: TopUpPackage[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top up balance</CardTitle>
        <CardDescription>Choose a top-up package, then start checkout with PayPal, Alipay, or WeChat Pay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-[var(--color-muted-foreground)]">
        <p>
          PayPal can be activated immediately once its sandbox credentials are configured. Alipay and WeChat are shown here and can be enabled after you add the required merchant parameters.
        </p>
        <PaymentMethodSelector providers={paymentProviders} topUpPackages={topUpPackages} />
        {!paymentProviders.some((provider) => provider.configured) ? (
          <div className="rounded-3xl border border-dashed p-4">
            No payment provider is configured in this environment yet. Add PayPal, Alipay, or WeChat merchant credentials to enable self-serve top-up.
          </div>
        ) : null}
        {canGrantDeveloperCredit ? (
          <div className="rounded-3xl border bg-[var(--color-secondary)]/60 p-4">
            <p className="mb-3 font-medium text-[var(--color-foreground)]">
              <span>Local development fallback: add </span>{formatUsdMicros(developerCreditUsdMicros)}<span> of test credit without using a payment provider.</span>
            </p>
            <DeveloperCreditButton />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
