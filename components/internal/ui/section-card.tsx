import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  actions,
  footer,
  padded = true,
  className,
  children
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "glass-panel rounded-2xl border border-white/8 bg-white/4",
        className
      )}
    >
      {(title || actions || description) && (
        <header className="flex flex-col gap-1 border-b border-white/6 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={cn(padded ? "p-5" : undefined)}>{children}</div>
      {footer ? <footer className="border-t border-white/6 px-5 py-3 text-xs text-slate-500">{footer}</footer> : null}
    </section>
  );
}
