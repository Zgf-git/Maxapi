import { AlertTriangle, WalletCards } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsdMicros } from "@/lib/utils";

export function BalanceOverview({
  balanceUsdMicros,
  minimumRequestBalanceUsdMicros
}: {
  balanceUsdMicros: bigint;
  minimumRequestBalanceUsdMicros: bigint;
}) {
  const isLow = balanceUsdMicros < minimumRequestBalanceUsdMicros;

  return (
    <Card className={isLow ? "border-amber-300/24 bg-[linear-gradient(135deg,rgba(94,71,18,0.34),rgba(8,17,31,0.95))]" : "bg-[var(--color-card)]/95"}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
            {isLow ? <AlertTriangle className="h-5 w-5 text-amber-200" /> : <WalletCards className="h-5 w-5 text-[var(--color-primary)]" />}
          </div>
          <div>
            <CardTitle>Your current balance</CardTitle>
            <CardDescription>This is the signed-in developer account balance, stored in integer USD micros and shown here as USD.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-4xl font-semibold tracking-tight">{formatUsdMicros(balanceUsdMicros)}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          <span>Requests are blocked when your balance is below </span>{formatUsdMicros(minimumRequestBalanceUsdMicros)}<span>. Each request also runs an estimated-cost preflight check before final usage is charged from provider-reported usage.</span>
        </p>
        {isLow ? (
          <div className="rounded-2xl border border-amber-300/24 bg-amber-300/8 p-4 text-sm text-amber-100">
            Balance is below the request threshold. Add developer credit locally or contact an operator for a manual credit before sending more traffic.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
