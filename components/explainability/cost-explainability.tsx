import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CostExplainability({ dashboard = false, showBillingLink = true }: { dashboard?: boolean; showBillingLink?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How cost is explained</CardTitle>
        <CardDescription>Route policies influence routing; they are not billing units.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
        <p>Billing is usage-based and uses the actual executed provider/model plus provider-reported token usage.</p>
        <p>Route policy names like Cheap, Balanced, Premium, and Auto are product abstractions, not fixed package prices.</p>
        <p>Explicit model requests are also billed from actual execution and the applicable pricing rules.</p>
        <p>Charges and credits appear in the billing balance journal and usage ledger; raw prompts and completions are not shown here.</p>
        {dashboard && showBillingLink ? (
          <Link className="inline-flex font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline" href="/dashboard/billing">
            Open billing ledger
          </Link>
        ) : !dashboard ? (
          <Link className="inline-flex font-medium text-[var(--color-foreground)] underline-offset-2 hover:underline" href="/pricing">
            Read pricing notes
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
