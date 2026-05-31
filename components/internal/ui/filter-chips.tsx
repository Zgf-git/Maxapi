import Link from "next/link";

import { cn } from "@/lib/utils";

type FilterChipsProps = {
  label: string;
  paramKey: string;
  current?: string | null;
  options: Array<{ value: string; label: string }>;
  baseSearchParams?: URLSearchParams;
  className?: string;
};

function paramsWith(
  base: URLSearchParams | undefined,
  paramKey: string,
  value: string | null
): URLSearchParams {
  const next = new URLSearchParams(base?.toString() ?? "");
  if (value === null) {
    next.delete(paramKey);
  } else {
    next.set(paramKey, value);
  }
  next.delete("page");
  return next;
}

export function FilterChips({
  label,
  paramKey,
  current,
  options,
  baseSearchParams,
  className
}: FilterChipsProps) {
  const items = [{ value: "", label: "All" }, ...options];

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      <span className="text-slate-500 uppercase tracking-[0.16em]">{label}</span>
      {items.map((option) => {
        const isAll = option.value === "";
        const selected = isAll ? !current : current === option.value;
        const params = paramsWith(baseSearchParams, paramKey, isAll ? null : option.value);
        const search = params.toString();

        return (
          <Link
            key={option.value || "__all"}
            href={search ? `?${search}` : "?"}
            className={cn(
              "rounded-full border px-3 py-1 transition",
              selected
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/8 bg-white/3 text-slate-300 hover:border-white/14 hover:bg-white/6 hover:text-white"
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
