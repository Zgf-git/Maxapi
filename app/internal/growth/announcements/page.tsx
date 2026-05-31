import { DataTable } from "@/components/internal/ui/data-table";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listAnnouncements } from "@/lib/internal/growth";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Announcements · Growth · Internal · MaxAPI"
};

export default async function InternalAnnouncementsPage() {
  const items = await listAnnouncements();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Announcements"
        description={`${(items as any[]).length} item(s)`}
      />

      <SectionCard padded={false}>
        <DataTable
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row: any) => (
                <div>
                  <div className="font-medium text-white">{row.title}</div>
                  <div className="max-w-xs truncate text-xs text-slate-500">{row.body}</div>
                </div>
              )
            },
            {
              key: "audience",
              header: "Audience",
              render: (row: any) => (
                <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs text-slate-200">
                  {row.audience}
                </span>
              )
            },
            {
              key: "status",
              header: "Status",
              render: (row: any) => <StatusBadge status={row.status} />
            },
            {
              key: "schedule",
              header: "Schedule",
              render: (row: any) => (
                <div className="text-xs text-slate-400">
                  {row.startsAt ? formatDateTime(row.startsAt) : "Immediately"}
                  {row.endsAt ? ` → ${formatDateTime(row.endsAt)}` : null}
                </div>
              )
            },
            {
              key: "created",
              header: "Created",
              render: (row: any) => formatDateTime(row.createdAt)
            }
          ]}
          rows={items as any[]}
          rowKey={(row: any) => row.id}
        />
      </SectionCard>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "border-slate-300/20 bg-slate-300/10 text-slate-200",
    PUBLISHED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    ARCHIVED: "border-amber-300/20 bg-amber-300/10 text-amber-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.DRAFT}`}>
      {status}
    </span>
  );
}
