import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { capturePayPalOrderForPurchase, getTopUpPurchaseForUser } from "@/lib/payments/gateway";
import { formatDateTime, formatUsdMicros } from "@/lib/utils";

export default async function BillingSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ purchase_id?: string; provider?: string; token?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const provider = (params.provider ?? "").toLowerCase();

  if (params.purchase_id && provider === "paypal") {
    await capturePayPalOrderForPurchase(user.id, params.purchase_id);
  }

  const purchase = params.purchase_id
    ? await getTopUpPurchaseForUser(user.id, params.purchase_id)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        description="The payment provider has returned you to MaxAPI. Your order status and account balance are updated from the provider flow linked to this purchase."
        eyebrow="My Billing"
        title="Payment return"
      />
      <Card>
        <CardHeader>
          <CardTitle>Payment confirmation status</CardTitle>
          <CardDescription>
            PayPal can be credited immediately after capture. Alipay and WeChat are credited after the signed provider callback confirms payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-muted-foreground)]">
          {purchase ? (
            <div className="rounded-3xl border bg-[var(--color-secondary)]/60 p-4">
              <p>Provider: <span className="font-medium text-[var(--color-foreground)]">{purchase.paymentProvider}</span></p>
              <p>Status: <span className="font-medium text-[var(--color-foreground)]">{purchase.status}</span></p>
              <p>Package: {purchase.packageId}</p>
              <p>Credit amount: {formatUsdMicros(purchase.creditsUsdMicros)}</p>
              <p>Credited at: {formatDateTime(purchase.creditedAt)}</p>
            </div>
          ) : (
            <p>No matching purchase record was found for this return URL. Check the Billing page for your current balance.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/requests">View requests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
