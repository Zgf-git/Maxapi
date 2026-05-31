"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShieldUser } from "lucide-react";

import { cn } from "@/lib/utils";

type InternalHeaderProps = {
  userEmail?: string | null;
  userRole?: string | null;
  environment: "live" | "sandbox";
};

const ROUTE_LABELS: Record<string, string> = {
  internal: "Internal",
  users: "Users",
  finance: "Finance",
  revenue: "Revenue",
  "top-ups": "Top-ups",
  cases: "Cases",
  providers: "Payment providers",
  operations: "Operations",
  pending: "Pending usage",
  failures: "Failures",
  abuse: "Abuse events",
  routing: "Routing",
  policies: "Policies",
  growth: "Growth",
  codes: "Redemption codes",
  announcements: "Announcements",
  referrals: "Referrals",
  audit: "Audit log",
  settings: "Settings"
};

function labelFor(segment: string) {
  return ROUTE_LABELS[segment] ?? segment;
}

function deriveCrumbs(pathname: string) {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Internal", href: "/internal" }];
  let acc = "";
  return segments.map((segment, index) => {
    acc = `${acc}/${segment}`;
    const isDynamic = segment.length > 16 && index > 0;
    return {
      label: isDynamic ? segment : labelFor(segment),
      href: acc
    };
  });
}

export function InternalHeader({ userEmail, userRole, environment }: InternalHeaderProps) {
  const pathname = usePathname();
  const crumbs = deriveCrumbs(pathname);

  return (
    <header className="glass-panel mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#07101dcc] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
              {isLast ? (
                <span className="font-medium text-white">{crumb.label}</span>
              ) : (
                <Link className="hover:text-white" href={crumb.href}>
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium uppercase tracking-[0.18em]",
            environment === "live"
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
              : "border-amber-300/30 bg-amber-300/10 text-amber-200"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {environment}
        </span>
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-slate-200">
          <ShieldUser className="h-3.5 w-3.5 text-slate-400" />
          <span>{userEmail ?? "unknown"}</span>
          {userRole ? <span className="text-slate-500">· {userRole}</span> : null}
        </div>
      </div>
    </header>
  );
}
