"use client";

export default function RequestsError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border bg-[var(--color-card)]/90 p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">Requests</p>
      <h1 className="mt-2 text-2xl font-semibold">Unable to load recent requests</h1>
      <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
        The requests dashboard hit an unexpected error while loading routing data for this account. Retry the view, and if the
        problem continues, check the server logs or backend health separately.
      </p>
      <button
        className="mt-6 inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
