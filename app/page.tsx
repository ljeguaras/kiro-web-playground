"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { CATEGORIES, type Category, getCategoryById } from "@/lib/categories";
import { categorizeExpense } from "@/lib/ai-categorizer";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  confidence: number;
  reasoning: string;
  date: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<{
    category: Category;
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [filter, setFilter] = useState<string>("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Real-time AI categorization preview as user types
  const updatePreview = useCallback((desc: string, amt: string) => {
    if (desc.trim().length < 2) {
      setPreviewCategory(null);
      return;
    }
    const result = categorizeExpense(desc, amt ? parseFloat(amt) : undefined);
    setPreviewCategory({
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updatePreview(description, amount);
    }, 300); // Debounce 300ms
    return () => clearTimeout(timeout);
  }, [description, amount, updatePreview]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsAdding(true);

    const result = categorizeExpense(description, parseFloat(amount));
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: parseFloat(amount),
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
      date: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setDescription("");
    setAmount("");
    setPreviewCategory(null);
    setIsAdding(false);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const filteredExpenses =
    filter === "all"
      ? expenses
      : expenses.filter((e) => e.category.id === filter);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category summary for chart
  const categorySummary = CATEGORIES.filter((c) => c.id !== "other")
    .map((cat) => ({
      ...cat,
      total: expenses
        .filter((e) => e.category.id === cat.id)
        .reduce((sum, e) => sum + e.amount, 0),
      count: expenses.filter((e) => e.category.id === cat.id).length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            💰 Expense Tracker
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:block">
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Add Expense Form */}
        <section aria-label="Add new expense" className="mb-8">
          <form
            onSubmit={handleAddExpense}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Add Expense
            </h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px_auto]">
              <div>
                <label htmlFor="description" className="sr-only">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you spend on? (e.g., 'Starbucks coffee', 'Uber to airport')"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="amount" className="sr-only">
                  Amount
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="$ Amount"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAdding || !description.trim() || !amount}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? "Adding..." : "Add"}
              </button>
            </div>

            {/* AI Category Preview */}
            {previewCategory && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 dark:bg-indigo-950/30">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  🤖 AI suggests:
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${previewCategory.category.color}`}
                >
                  {previewCategory.category.emoji} {previewCategory.category.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({Math.round(previewCategory.confidence * 100)}% confidence)
                </span>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              ✨ AI auto-categorizes your expenses as you type — no manual selection needed!
            </p>
          </form>
        </section>

        {/* Summary Cards */}
        {expenses.length > 0 && (
          <section aria-label="Expense summary" className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  ${totalAmount.toFixed(2)}
                </p>
              </article>
              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredExpenses.length}
                </p>
              </article>
              <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 sm:col-span-2">
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Top Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categorySummary.slice(0, 4).map((cat) => (
                    <span
                      key={cat.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cat.color}`}
                    >
                      {cat.emoji} {cat.name}: ${cat.total.toFixed(0)}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {/* Filter by Category */}
        {expenses.length > 0 && (
          <section aria-label="Filter expenses" className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                All ({expenses.length})
              </button>
              {categorySummary.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === cat.id
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat.emoji} {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Expense List */}
        <section aria-label="Expense list">
          {expenses.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-4xl">📝</p>
              <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No expenses yet
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your first expense above — AI will categorize it automatically!
              </p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                No expenses in this category
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredExpenses.map((expense) => (
                <li
                  key={expense.id}
                  className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-800 sm:gap-4"
                >
                  <span className="text-2xl">{expense.category.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${expense.category.color}`}
                      >
                        {expense.category.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500" title={expense.reasoning}>
                        🤖 {Math.round(expense.confidence * 100)}%
                      </span>
                      <time className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                  <p className="text-right font-semibold text-gray-900 dark:text-white">
                    ${expense.amount.toFixed(2)}
                  </p>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    aria-label={`Delete expense: ${expense.description}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Category Legend */}
        <aside className="mt-8">
          <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              📋 All AI Categories ({CATEGORIES.length})
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${cat.color}`}
                >
                  <span>{cat.emoji}</span>
                  <span className="font-medium">{cat.name}</span>
                </div>
              ))}
            </div>
          </details>
        </aside>
      </main>
    </div>
  );
}
