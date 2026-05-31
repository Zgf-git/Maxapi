import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  description,
  variant = "default"
}: {
  label: string;
  value: string;
  description: string;
  variant?: "default" | "emerald" | "amber" | "rose";
}) {
  const variantStyles = {
    default: "border-white/10 bg-white/6",
    emerald: "border-emerald-300/16 bg-emerald-300/8",
    amber: "border-amber-300/16 bg-amber-300/8",
    rose: "border-rose-300/16 bg-rose-300/8"
  };

  const valueStyles = {
    default: "text-white",
    emerald: "text-emerald-200",
    amber: "text-amber-200",
    rose: "text-rose-200"
  };

  return (
    <div className={cn("rounded-[1.75rem] border p-5 shadow-[0_16px_50px_rgba(3,8,20,0.22)] backdrop-blur-xl", variantStyles[variant])}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", valueStyles[variant])}>{value}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
