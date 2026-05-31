import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { Pagination } from "@/components/internal/ui/pagination";
import { SearchInput } from "@/components/internal/ui/search-input";
import { SectionCard } from "@/components/internal/ui/section-card";
import { searchAuditLogs } from "@/lib/internal/audit";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Audit log · Internal · MaxAPI"
};

export default async function InternalAuditPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const action = params.action ?? null;
  const resourceType = params.resourceType ?? null;

  const { items, total, pageCount } = await searchAuditLogs({
    page,
    action,
    resourceType
  });

  const baseSearchParams = new URLSearchParams();
  if (action) baseSearchParams.set("action", action);
  if (resourceType) baseSearchParams.set("resourceType", resourceType);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Audit log"
        description={`${total.toLocaleString()} entries`}
      />

      <form method="get" className="flex gap-2">
        <SearchInput
          name="action"
          placeholder="Filter by action…"
          defaultValue={action ?? undefined}
          className="max-w-xs"
        />
        <SearchInput
          name="resourceType"
          placeholder="Filter by resource type…"
          defaultValue={resourceType ?? undefined}
          className="max-w-xs"
        />
      </form>

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "time",
              header: "Time",
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "action",
              header: "Action",
              render: (row) => (
                <span className="font-mono text-sm text-cyan-200">{row.action}</span>
              )
            },
            {
              key: "actor",
              header: "Actor",
              render: (row) => (
                <span className="text-sm text-slate-300">
                  {row.actorUser?.email ?? "system"}
                </span>
              )
            },
            {
              key: "target",
              header: "Target",
              render: (row) => (
                <span className="text-sm text-slate-300">
                  {row.targetUser?.email ?? "—"}
                </span>
              )
            },
            {
              key: "resource",
              header: "Resource",
              render: (row) => (
                <span className="text-xs text-slate-400">
                  {row.resourceType}
                  {row.resourceId ? ` · ${row.resourceId.slice(0, 8)}…` : null}
                </span>
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
