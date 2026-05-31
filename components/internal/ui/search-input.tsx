"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchInputProps = {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
};

export function SearchInput({
  name = "search",
  placeholder = "Search…",
  defaultValue,
  className
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-white/8 bg-white/4 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/30 focus:bg-white/6"
      />
    </div>
  );
}
