"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Transaction, Budget, Profile } from "@/lib/types";
import { formatCurrency, getMonthKey, getCategoryColor } from "@/lib/utils";
import { CurrencyCode } from "@/lib/types";
import { Camera, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = getMonthKey(new Date());
  const currency = (profile?.currency || "USD") as CurrencyCode;

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, transRes, budgetRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase.from("budgets").select("*, category:categories(*)").eq("user_id", user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (transRes.data) setTransactions(transRes.data);
    if (budgetRes.data) setBudgets(budgetRes.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculate stats for current month
  const monthTransactions = transactions.filter(
    (t) => t.date.startsWith(currentMonth.slice(0, 7))
  );
  const totalIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpenses;

  // Pie chart data: spending by category this month
  const categorySpending = monthTransactions
    .filter((t) => t.type === "expense" && t.category)
    .reduce((acc, t) => {
      const catName = t.category?.name || "Other";
      acc[catName] = (acc[catName] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categorySpending).map(([name, value]) => ({
    name,
    value,
    color: getCategoryColor(name),
  }));

  // Bar chart data: income vs expenses last 6 months
  const barData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthTrans = transactions.filter((t) => t.date.startsWith(key));
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      income: monthTrans
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0),
      expenses: monthTrans
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // Line chart data: daily spending trend this month
  const lineData = (() => {
    const days: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const day = new Date(t.date).getDate().toString();
        days[day] = (days[day] || 0) + Number(t.amount);
      });
    return Object.entries(days)
      .map(([day, amount]) => ({ day: `Day ${day}`, amount }))
      .sort((a, b) => parseInt(a.day.split(" ")[1]) - parseInt(b.day.split(" ")[1]));
  })();

  // Budget progress
  const budgetProgress = budgets
    .filter((b) => b.month === currentMonth)
    .map((b) => {
      const spent = monthTransactions
        .filter((t) => t.type === "expense" && t.category_id === b.category_id)
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        category: b.category?.name || "Unknown",
        budget: Number(b.amount),
        spent,
        percentage: Math.min((spent / Number(b.amount)) * 100, 100),
      };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Camera className="h-4 w-4" />
            Scan Receipt
          </Link>
          <Link
            href="/transactions/new"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Manual
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalIncome, currency)}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(balance, currency)}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Category Breakdown */}
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), currency)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              No expense data this month
            </div>
          )}
        </article>

        {/* Bar Chart - Income vs Expenses */}
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        {/* Line Chart - Spending Trend */}
        <article className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Daily Spending Trend</h2>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No spending data this month
            </div>
          )}
        </article>
      </section>

      {/* Budget Progress */}
      {budgetProgress.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
          <div className="space-y-4">
            {budgetProgress.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.spent, currency)} / {formatCurrency(item.budget, currency)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.percentage >= 100
                        ? "bg-destructive"
                        : item.percentage >= 80
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
