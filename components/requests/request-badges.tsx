import { Badge } from "@/components/ui/badge";

export function RequestStatusBadge({ status }: { status: "SUCCESS" | "ERROR" }) {
  return <Badge variant={status === "SUCCESS" ? "success" : "default"}>{status === "SUCCESS" ? "Success" : "Error"}</Badge>;
}

export function ProviderBadge({ provider }: { provider: string }) {
  return <Badge variant="muted" className="capitalize">{provider}</Badge>;
}

export function RoutePolicyBadge({ routePolicy }: { routePolicy: string | null }) {
  if (!routePolicy) {
    return <span className="text-[var(--color-muted-foreground)]">—</span>;
  }

  return <Badge variant="default" className="capitalize">{routePolicy}</Badge>;
}

export function FallbackBadge({ used }: { used: boolean }) {
  return <Badge variant={used ? "success" : "muted"}>{used ? "Used" : "No"}</Badge>;
}
