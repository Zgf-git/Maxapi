import { Badge } from "@/components/ui/badge";

export function BalanceTransactionBadge({ type }: { type: string }) {
  if (type === "CREDIT") {
    return <Badge variant="success">Credit</Badge>;
  }

  if (type === "DEBIT") {
    return <Badge>Debit</Badge>;
  }

  return <Badge variant="muted">Adjustment</Badge>;
}

export function UsageLedgerStatusBadge({ status }: { status: string }) {
  if (status === "FINALIZED") {
    return <Badge variant="success">Finalized</Badge>;
  }

  if (status === "PENDING") {
    return <Badge>Pending</Badge>;
  }

  if (status === "UNBILLABLE") {
    return <Badge variant="muted">Unbillable</Badge>;
  }

  return <Badge variant="muted">Failed</Badge>;
}
