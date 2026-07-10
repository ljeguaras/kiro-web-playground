"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/types";
import { Save, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewTransactionPage() {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // AI auto-categorization state
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  async function loadCategories() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (data) setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // AI auto-categorization: call Gemini when note changes
  const autoCategorize = useCallback(
    async (description: string, amt: string) => {
      if (description.trim().length < 3 || categories.length === 0) {
        setAiSuggestion(null);
        return;
      }

      setIsAiLoading(true);
      try {
        const categoryNames = categories.map((c) => c.name);
        const res = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            amount: amt ? parseFloat(amt) : undefined,
            categories: categoryNames,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.category) {
            setAiSuggestion(data.category);
            setAiConfidence(data.confidence || 0);
            setAiReasoning(data.reasoning || "");

            // Auto-select the category if confidence is high
            const matchedCategory = categories.find(
              (c) =>
                c.name.toLowerCase() === data.category.toLowerCase()
            );
            if (matchedCategory && data.confidence >= 0.7) {
              setCategoryId(matchedCategory.id);
            }
          }
        }
      } catch {
        // Silently fail — AI suggestion is optional
      } finally {
        setIsAiLoading(false);
      }
    },
    [categories]
  );

  // Debounce AI categorization
  useEffect(() => {
    if (type !== "expense") return;
    const timeout = setTimeout(() => {
      autoCategorize(note, amount);
    }, 600);
    return () => clearTimeout(timeout);
  }, [note, amount, type, autoCategorize]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type,
        amount: parseFloat(amount),
        category_id: categoryId || null,
        date,
        note: note || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      router.push("/transactions");
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <header>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
        <h1 className="text-2xl font-bold">Add Transaction</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Type Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              type === "expense"
                ? "bg-red-600 text-white"
                : "hover:bg-secondary"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              type === "income"
                ? "bg-green-600 text-white"
                : "hover:bg-secondary"
            }`}
          >
            Income
          </button>
        </div>

        {/* Note — moved ABOVE category so AI can suggest before user picks */}
        <div>
          <label htmlFor="note" className="block text-sm font-medium mb-1">
            Description
          </label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Starbucks coffee, Uber to work, Netflix subscription"
          />
          {type === "expense" && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Gemini AI auto-selects the category as you type
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0.00"
          />
        </div>

        {/* Category — with AI suggestion */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium mb-1"
          >
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* AI Suggestion indicator */}
          {type === "expense" && (isAiLoading || aiSuggestion) && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              {isAiLoading ? (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Gemini AI analyzing...
                </span>
              ) : aiSuggestion ? (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-primary">
                    AI suggests: {aiSuggestion} ({Math.round(aiConfidence * 100)}%)
                  </span>
                  {aiReasoning && (
                    <span className="text-xs text-muted-foreground">
                      {aiReasoning}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {loading ? "Saving..." : "Save Transaction"}
        </button>
      </form>
    </div>
  );
}
