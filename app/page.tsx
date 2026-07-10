"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { CATEGORIES, type Category, getCategoryById } from "@/lib/categories";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  confidence: number;
  reasoning: string;
  date: string;
}

interface CategoryPreview {
  category: Category;
  confidence: number;
  reasoning: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<CategoryPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Receipt OCR state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Real-time AI categorization preview via Gemini API (debounced)
  const updatePreview = useCallback(async (desc: string, amt: string) => {
    if (desc.trim().length < 3) {
      setPreviewCategory(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          amount: amt ? parseFloat(amt) : undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPreviewCategory({
            category: getCategoryById(json.data.categoryId),
            confidence: json.data.confidence,
            reasoning: json.data.reasoning,
          });
        }
      }
    } catch {
      // Silently fail preview - not critical
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updatePreview(description, amount);
    }, 600); // Debounce 600ms for API calls
    return () => clearTimeout(timeout);
  }, [description, amount, updatePreview]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsAdding(true);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
        }),
      });

      let category: Category = getCategoryById("other");
      let confidence = 0.5;
      let reasoning = "Categorized";

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          category = getCategoryById(json.data.categoryId);
          confidence = json.data.confidence;
          reasoning = json.data.reasoning;
        }
      }

      const newExpense: Expense = {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        confidence,
        reasoning,
        date: new Date().toISOString(),
      };

      setExpenses((prev) => [newExpense, ...prev]);
      setDescription("");
      setAmount("");
      setPreviewCategory(null);
    } catch {
      // Still add with fallback
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: parseFloat(amount),
        category: getCategoryById("other"),
        confidence: 0,
        reasoning: "API unavailable",
        date: new Date().toISOString(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
      setDescription("");
      setAmount("");
    } finally {
      setIsAdding(false);
    }
  };

  // Receipt OCR handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/categorize", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          const newExpenses: Expense[] = json.data.map(
            (item: {
              description: string;
              amount: number;
              categoryId: string;
              confidence: number;
              reasoning: string;
            }) => ({
              id: crypto.randomUUID(),
              description: item.description,
              amount: item.amount,
              category: getCategoryById(item.categoryId),
              confidence: item.confidence,
              reasoning: item.reasoning,
              date: new Date().toISOString(),
            })
          );

          setExpenses((prev) => [...newExpenses, ...prev]);
          setScanResult(
            `✅ Extracted ${newExpenses.length} item${newExpenses.length > 1 ? "s" : ""} from receipt`
          );
        } else {
          setScanResult("⚠️ Could not read any items from the receipt. Try a clearer photo.");
        }
      } else {
        const errorJson = await res.json().catch(() => null);
        setScanResult(`❌ ${errorJson?.error || "Failed to process receipt"}`);
      }
    } catch {
      setScanResult("❌ Network error. Please try again.");
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const filteredExpenses =
    filter === "all"
      ? expenses
      : expenses.filter((e) => e.category.id === filter);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category summary
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
        <section aria-label="Add new expense" className="mb-6">
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
            {(previewCategory || isPreviewLoading) && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 dark:bg-indigo-950/30">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  🤖 Gemini AI:
                </span>
                {isPreviewLoading ? (
                  <span className="text-xs text-gray-500 animate-pulse">Analyzing...</span>
                ) : previewCategory ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${previewCategory.category.color}`}
                    >
                      {previewCategory.category.emoji} {previewCategory.category.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({Math.round(previewCategory.confidence * 100)}% confidence)
                    </span>
                    <span className="hidden text-xs text-gray-400 sm:inline" title={previewCategory.reasoning}>
                      — {previewCategory.reasoning}
                    </span>
                  </>
                ) : null}
              </div>
            )}

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              ✨ Powered by Google Gemini — auto-categorizes as you type, no manual selection needed!
            </p>
          </form>
        </section>

        {/* Receipt OCR Section */}
        <section aria-label="Scan receipt" className="mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              📸 Scan Receipt
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Upload a receipt photo — Gemini AI extracts all items, amounts, and auto-categorizes each one.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label
                htmlFor="receipt-upload"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-6 py-3 text-sm font-medium transition-colors ${
                  isScanning
                    ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800"
                    : "border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                }`}
              >
                {isScanning ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scanning with Gemini...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Upload Receipt Photo
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="receipt-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleReceiptUpload}
                  disabled={isScanning}
                  className="sr-only"
                />
              </label>

              {scanResult && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{scanResult}</p>
              )}
            </div>
          </div>
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
                Add an expense above or scan a receipt — Gemini AI categorizes everything automatically!
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
                      <span
                        className="text-xs text-gray-400 dark:text-gray-500"
                        title={expense.reasoning}
                      >
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
