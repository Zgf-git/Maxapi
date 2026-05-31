import { Badge } from "@/components/ui/badge";

export function CapabilityBadge({
  label,
  supported
}: {
  label: string;
  supported: boolean;
}) {
  return <Badge variant={supported ? "success" : "muted"}>{label}: {supported ? "Yes" : "No"}</Badge>;
}

export function StatusBadge({ status }: { status: "active" | "beta" | "hidden" }) {
  if (status === "active") {
    return <Badge variant="success">Active</Badge>;
  }

  if (status === "beta") {
    return <Badge>Beta</Badge>;
  }

  return <Badge variant="muted">Hidden</Badge>;
}

export function ProviderLabel({ provider }: { provider: string }) {
  return <Badge variant="muted">{provider}</Badge>;
}
