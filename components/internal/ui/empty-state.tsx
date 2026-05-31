import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 bg-white/2 px-6 py-12 text-center",
        className
      )}
    >
      {icon ? <div className="text-slate-500">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">{title}</p>
        {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
