"use client";

import { useEffect, useState } from "react";
import { Budget, Category, Transaction, Profile } from "@/lib/types";
import { formatCurrency, getMonthKey, getMonthName, getCategoryColor } from "@/lib/utils";
import { CurrencyCode } from "@/lib/types";
import { Plus, Save, Trash2, PiggyBank } from "lucide-react";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const currency = (profile?.currency || "USD") as CurrencyCode;

  async function loadData() {
    try {
      const [profileRes, budgetRes, catRes, transRes] = await Promise.all([
        fetch("/api/data/profile"),
        fetch("/api/data/budgets"),
        fetch("/api/data/categories"),
        fetch("/api/data/transactions"),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (budgetRes.ok) setBudgets(await budgetRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (transRes.ok) {
        const allTrans = await transRes.json();
        setTransactions(allTrans.filter((t: Transaction) => t.type === "expense"));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!formCategoryId || !formAmount) return;

    setSaving(true);
    try {
      const res = await fetch("/api/data/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: formCategoryId,
          month: selectedMonth,
          amount: parseFloat(formAmount),
        }),
      });

      if (res.ok) {
        const newBudget = await res.json();
        // Attach category info
        const cat = categories.find((c) => c.id === formCategoryId);
        if (cat) newBudget.category = cat;

        setBudgets((prev) => {
          const existing = prev.findIndex(
            (b) => b.category_id === formCategoryId && b.month === selectedMonth
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newBudget;
            return updated;
          }
          return [...prev, newBudget];
        });
        setFormCategoryId("");
        setFormAmount("");
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to add budget:", error);
    }
    setSaving(false);
  }

  async function deleteBudget(id: string) {
    if (!confirm("Remove this budget limit?")) return;
    const res = await fetch(`/api/data/budgets?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    }
  }

  const monthBudgets = budgets.filter((b) => b.month === selectedMonth);
  const monthTransactions = transactions.filter(
    (t) => t.date.startsWith(selectedMonth.slice(0, 7))
  );

  // Calculate totals
  const totalBudget = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = monthTransactions.reduce((s, t) => s + Number(t.amount), 0);

  // Generate month options (last 6 months + next 2)
  const monthOptions = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return getMonthKey(d);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monthly Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Set spending limits for each category
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Budget
          </button>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalBudget, currency)}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className={`text-2xl font-bold mt-1 ${totalSpent > totalBudget ? "text-destructive" : ""}`}>
            {formatCurrency(totalSpent, currency)}
          </p>
        </article>
      </section>

      {/* Add Budget Form */}
      {showForm && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Add Budget for {getMonthName(selectedMonth)}</h2>
          <form onSubmit={handleAddBudget} className="flex flex-col sm:flex-row gap-3">
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              required
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="Budget amount"
              className="w-full sm:w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </section>
      )}

      {/* Budget List */}
      <section className="space-y-3">
        {monthBudgets.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">
              No budgets set for {getMonthName(selectedMonth)}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Set Your First Budget
            </button>
          </div>
        ) : (
          monthBudgets.map((budget) => {
            const spent = monthTransactions
              .filter((t) => t.category_id === budget.category_id)
              .reduce((s, t) => s + Number(t.amount), 0);
            const percentage = Math.min((spent / Number(budget.amount)) * 100, 100);
            const categoryName = budget.category?.name || "Unknown";

            return (
              <article
                key={budget.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(categoryName) }}
                    />
                    <span className="font-medium">{categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(spent, currency)} / {formatCurrency(Number(budget.amount), currency)}
                    </span>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentage >= 100
                        ? "bg-destructive"
                        : percentage >= 80
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {percentage.toFixed(0)}% used
                  {percentage >= 100 && " - Over budget!"}
                  {percentage >= 80 && percentage < 100 && " - Almost there"}
                </p>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
