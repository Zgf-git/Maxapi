import { requirePageUser } from "@/lib/auth/session";
import { normalizeObservabilityFilters } from "@/lib/observability/filters";
import { getObservabilityPageData } from "@/lib/observability/service";
import { RequestsDashboardView } from "@/components/requests/requests-dashboard-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageUser();
  const resolvedSearchParams = await searchParams;
  const filters = normalizeObservabilityFilters(resolvedSearchParams);
  const { rows, summary } = await getObservabilityPageData(user.id, filters);

  return <RequestsDashboardView filters={filters} rows={rows} summary={summary} />;
}
