import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { markTopUpCanceled } from "@/lib/payments/gateway";

export default async function BillingCancelPage({
  searchParams
}: {
  searchParams: Promise<{ purchase_id?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;

  if (params.purchase_id) {
    await markTopUpCanceled(user.id, params.purchase_id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="The selected payment flow was canceled before payment completion. No balance credit was granted."
        eyebrow="My Billing"
        title="Payment canceled"
      />
      <Card>
        <CardHeader>
          <CardTitle>No payment was completed</CardTitle>
          <CardDescription>You can return to billing and start a new top-up whenever you are ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/billing">Back to billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
