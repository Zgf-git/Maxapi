import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listAbuseEvents } from "@/lib/internal/operations";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Abuse events · Operations · Internal · MaxAPI"
};

export default async function InternalAbusePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { items, total, pageCount } = await listAbuseEvents(page);

  const baseSearchParams = new URLSearchParams();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Abuse events"
        description={`${total.toLocaleString()} events recorded`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "time",
              header: "Time",
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "user",
              header: "User",
              render: (row) => (
                <span className="text-sm text-white">{row.userEmail ?? "—"}</span>
              )
            },
            {
              key: "type",
              header: "Event type",
              render: (row) => (
                <span className="text-sm text-white">{row.eventType}</span>
              )
            },
            {
              key: "severity",
              header: "Severity",
              render: (row) => <SeverityBadge severity={row.severity} />
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs font-medium text-slate-200">
                  {row.status}
                </span>
              )
            },
            {
              key: "reason",
              header: "Reason",
              render: (row) => (
                <span className="text-sm text-slate-300">{row.reasonCode}</span>
              )
            },
            {
              key: "model",
              header: "Model",
              render: (row) => (
                <span className="text-xs text-slate-500">{row.requestedModel ?? "—"}</span>
              )
            }
          ]}
          rows={items}
          rowKey={(row) => row.id}
        />
        {items.length > 0 && (
          <div className="border-t border-white/6 px-4 py-3">
            <Pagination page={page} pageCount={pageCount} baseSearchParams={baseSearchParams} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    info: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    critical: "border-rose-300/20 bg-rose-300/10 text-rose-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[severity] ?? styles.info}`}>
      {severity}
    </span>
  );
}
