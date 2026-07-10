"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Transaction, Category, Profile } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencyCode } from "@/lib/types";
import { Plus, Camera, Download, Trash2, Filter } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const currency = (profile?.currency || "USD") as CurrencyCode;

  async function loadData() {
    try {
      const [profileRes, transRes, catRes] = await Promise.all([
        fetch("/api/data/profile"),
        fetch("/api/data/transactions"),
        fetch("/api/data/categories"),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (transRes.ok) setTransactions(await transRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function deleteTransaction(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/data/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function exportCSV() {
    const filtered = getFilteredTransactions();
    const headers = "Date,Type,Category,Amount,Note\n";
    const rows = filtered
      .map(
        (t) =>
          `${t.date},${t.type},${t.category?.name || "Uncategorized"},${t.amount},"${t.note || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getFilteredTransactions() {
    return transactions.filter((t) => {
      if (filterCategory && t.category_id !== filterCategory) return false;
      if (filterType && t.type !== filterType) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      return true;
    });
  }

  const filtered = getFilteredTransactions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Camera className="h-4 w-4" />
            Scan
          </Link>
          <Link
            href="/transactions/new"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </Link>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              showFilters ? "border-primary text-primary bg-primary/5" : "border-border hover:bg-secondary"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setFilterCategory("");
              setFilterType("");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Clear all filters
          </button>
        </section>
      )}

      {/* Transaction List */}
      <section className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No transactions found</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/scan"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Scan a Receipt
              </Link>
              <Link
                href="/transactions/new"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
              >
                Add Manually
              </Link>
            </div>
          </div>
        ) : (
          filtered.map((t) => (
            <article
              key={t.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {t.note || t.category?.name || "Transaction"}
                  </span>
                  {t.category && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {t.category.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(t.date)}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  t.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {t.type === "income" ? "+" : "-"}
                {formatCurrency(Number(t.amount), currency)}
              </span>
              <button
                onClick={() => deleteTransaction(t.id)}
                className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
