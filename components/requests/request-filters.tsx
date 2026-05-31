import Link from "next/link";

import { buildObservabilityFilterHref } from "@/lib/observability/filters";
import {
  OBSERVABILITY_FALLBACK_OPTIONS,
  OBSERVABILITY_PROVIDERS,
  OBSERVABILITY_ROUTE_POLICIES,
  OBSERVABILITY_STATUSES,
  type ObservabilityFilters
} from "@/lib/observability/types";

const FILTER_SECTIONS = [
  {
    key: "provider",
    label: "Provider",
    options: OBSERVABILITY_PROVIDERS
  },
  {
    key: "status",
    label: "Status",
    options: OBSERVABILITY_STATUSES
  },
  {
    key: "routePolicy",
    label: "Route policy",
    options: OBSERVABILITY_ROUTE_POLICIES
  },
  {
    key: "fallbackUsed",
    label: "Fallback",
    options: OBSERVABILITY_FALLBACK_OPTIONS
  }
] as const;

export function RequestFilters({ filters }: { filters: ObservabilityFilters }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {FILTER_SECTIONS.map((section) => (
        <div className="space-y-2" key={section.key}>
          <p className="text-sm font-medium">{section.label}</p>
          <div className="flex flex-wrap gap-2">
            {["all", ...section.options].map((option) => {
              const nextFilters = {
                ...filters,
                [section.key]: option === "all" ? undefined : option
              };
              const query = buildObservabilityFilterHref(nextFilters);
              const isActive = (filters[section.key] ?? "all") === option;

              return (
                <Link
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"
                  }`}
                  href={`/dashboard/requests${query ? `?${query}` : ""}`}
                  key={option}
                >
                  {option}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
