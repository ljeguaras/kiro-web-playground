import { CURRENCIES, CurrencyCode } from "./types";

export function formatCurrency(amount: number, currencyCode: CurrencyCode = "USD"): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return `${currency?.symbol || "$"}${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getMonthName(monthKey: string): string {
  const date = new Date(monthKey);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Food: "#ef4444",
    Drinks: "#f97316",
    Transportation: "#eab308",
    Bills: "#8b5cf6",
    Entertainment: "#ec4899",
    Savings: "#10b981",
    Hygiene: "#06b6d4",
    Cleaning: "#14b8a6",
    Household: "#6366f1",
    Other: "#64748b",
  };
  return colors[category] || colors.Other;
}
