"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { key: "activity", label: "Activity" },
  { key: "cases", label: "Cases" },
  { key: "audit", label: "Audit" },
  { key: "keys", label: "Keys" },
  { key: "actions", label: "Actions" }
];

export function UserDetailTabs({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") ?? "activity";

  return (
    <nav className="flex gap-1 border-b border-white/6 pb-px" aria-label="Tabs">
      {TABS.map((tab) => {
        const active = current === tab.key;
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab.key);
        return (
          <Link
            key={tab.key}
            href={`/internal/users/${userId}?${params.toString()}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition",
              active
                ? "border-b-2 border-cyan-300 text-cyan-100"
                : "text-slate-400 hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
