import Link from "next/link";

import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  baseSearchParams?: URLSearchParams;
  className?: string;
};

function pageHref(base: URLSearchParams | undefined, page: number) {
  const params = new URLSearchParams(base?.toString() ?? "");
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search ? `?${search}` : "?";
}

function pageWindow(page: number, pageCount: number): number[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const start = Math.max(2, page - 2);
  const end = Math.min(pageCount - 1, page + 2);
  const pages: number[] = [1];
  if (start > 2) pages.push(-1);
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < pageCount - 1) pages.push(-1);
  pages.push(pageCount);
  return pages;
}

export function Pagination({ page, pageCount, baseSearchParams, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const window = pageWindow(page, pageCount);
  const prev = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);

  return (
    <nav className={cn("flex items-center justify-center gap-1 text-xs", className)}>
      <Link
        aria-disabled={page === 1}
        className={cn(
          "rounded-full border border-white/8 px-3 py-1 text-slate-300 hover:border-white/14 hover:bg-white/6",
          page === 1 && "pointer-events-none opacity-40"
        )}
        href={pageHref(baseSearchParams, prev)}
      >
        ‹
      </Link>
      {window.map((pageNumber, index) => {
        if (pageNumber === -1) {
          return (
            <span key={`gap-${index}`} className="px-2 text-slate-500">
              …
            </span>
          );
        }
        const isActive = pageNumber === page;
        return (
          <Link
            key={pageNumber}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "min-w-[2rem] rounded-full border px-3 py-1 text-center transition",
              isActive
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/8 text-slate-300 hover:border-white/14 hover:bg-white/6"
            )}
            href={pageHref(baseSearchParams, pageNumber)}
          >
            {pageNumber}
          </Link>
        );
      })}
      <Link
        aria-disabled={page === pageCount}
        className={cn(
          "rounded-full border border-white/8 px-3 py-1 text-slate-300 hover:border-white/14 hover:bg-white/6",
          page === pageCount && "pointer-events-none opacity-40"
        )}
        href={pageHref(baseSearchParams, next)}
      >
        ›
      </Link>
    </nav>
  );
}
