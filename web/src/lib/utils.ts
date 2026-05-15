import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat("zh-CN", options).format(n);
}

export function formatCurrency(n: number, currency: "CNY" | "USD" = "CNY"): string {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${formatNumber(n, { maximumFractionDigits: 2 })}`;
}

export function formatPercent(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatDate(d: Date | string, fmt: "short" | "long" | "iso" = "short"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (fmt === "iso") return date.toISOString().slice(0, 10);
  if (fmt === "long") {
    return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
