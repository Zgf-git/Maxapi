import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RequestsLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-muted)]" />
          <div className="h-8 w-56 animate-pulse rounded-full bg-[var(--color-muted)]" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-[var(--color-muted)]" />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-muted)]" />
              <div className="h-8 w-20 animate-pulse rounded-full bg-[var(--color-muted)]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-muted)]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--color-muted)]" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-[var(--color-muted)]" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-2xl bg-[var(--color-muted)]" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-[var(--color-muted)]" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-[var(--color-muted)]" />
        </CardContent>
      </Card>
    </div>
  );
}
