import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty?: ReactNode;
  className?: string;
};

const ALIGN_CLASS: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center"
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  className
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-3 font-medium",
                  column.align ? ALIGN_CLASS[column.align] : ALIGN_CLASS.left,
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "transition hover:bg-white/4",
                rowHref ? "cursor-pointer" : undefined
              )}
            >
              {columns.map((column) => {
                const content = column.render(row);
                const cellClass = cn(
                  "px-4 py-3 text-slate-200",
                  column.align ? ALIGN_CLASS[column.align] : ALIGN_CLASS.left,
                  column.className
                );

                if (rowHref) {
                  return (
                    <td key={column.key} className={cellClass}>
                      <a className="block" href={rowHref(row)}>
                        {content}
                      </a>
                    </td>
                  );
                }

                return (
                  <td key={column.key} className={cellClass}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
