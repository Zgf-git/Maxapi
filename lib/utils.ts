import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export function formatUsdMicros(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  const micros = typeof value === "number" ? BigInt(value) : value;
  const sign = micros < 0n ? "-" : "";
  const absolute = micros < 0n ? -micros : micros;
  const dollars = absolute / 1_000_000n;
  const fractionalMicros = (absolute % 1_000_000n).toString().padStart(6, "0");
  if (absolute > 0n && absolute < 10_000n) {
    return `${sign}$${dollars.toString()}.${fractionalMicros}`;
  }

  const visibleFraction = fractionalMicros.replace(/0+$/, "").padEnd(2, "0");

  return `${sign}$${dollars.toString()}.${visibleFraction}`;
}

export function formatWholeNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en").format(value);
}
