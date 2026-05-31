import { Card, CardContent } from "@/components/ui/card";

export default function BillingLoading() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-sm text-[var(--color-muted-foreground)]">Loading billing records...</CardContent>
      </Card>
    </div>
  );
}
