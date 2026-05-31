import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PlaygroundLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-muted)]" />
          <div className="h-8 w-56 animate-pulse rounded-full bg-[var(--color-muted)]" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-[var(--color-muted)]" />
        </CardHeader>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3">
              <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--color-muted)]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-muted)]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--color-muted)]" />
              <div className="h-32 w-full animate-pulse rounded-2xl bg-[var(--color-muted)]" />
              <div className="h-12 w-32 animate-pulse rounded-full bg-[var(--color-muted)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
