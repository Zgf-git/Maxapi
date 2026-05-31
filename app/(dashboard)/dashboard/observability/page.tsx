import { redirect } from "next/navigation";

import { buildObservabilityFilterHref, normalizeObservabilityFilters } from "@/lib/observability/filters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ObservabilityPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = normalizeObservabilityFilters(await searchParams);
  const query = buildObservabilityFilterHref(filters);

  redirect(`/dashboard/requests${query ? `?${query}` : ""}`);
}
