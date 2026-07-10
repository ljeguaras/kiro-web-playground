"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Category, CURRENCIES } from "@/lib/types";
import { getCategoryColor } from "@/lib/utils";
import { Save, Plus, Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function loadData() {
    try {
      const [profileRes, catRes] = await Promise.all([
        fetch("/api/data/profile"),
        fetch("/api/data/categories"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setDisplayName(profileData.display_name || "");
        setCurrency(profileData.currency);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/data/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          currency,
        }),
      });

      if (res.ok) {
        setMessage("Profile saved successfully!");
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
    setSaving(false);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      const res = await fetch("/api/data/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) =>
          [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewCategory("");
      }
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  }

  async function deleteCategory(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (cat?.is_default) {
      alert("Cannot delete default categories.");
      return;
    }
    if (!confirm(`Delete category "${cat?.name}"? Transactions will be set to uncategorized.`))
      return;

    const res = await fetch(`/api/data/categories?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }

  async function deleteAccount() {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed."
      )
    )
      return;
    if (!confirm("Final confirmation: Delete account and all data?")) return;

    await fetch("/api/auth/delete", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </header>

      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Profile Settings */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Categories */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Categories</h2>

        <form onSubmit={addCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>

        <ul className="space-y-1">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCategoryColor(cat.name) }}
                />
                <span className="text-sm">{cat.name}</span>
                {cat.is_default && (
                  <span className="text-xs text-muted-foreground">(default)</span>
                )}
              </div>
              {!cat.is_default && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={deleteAccount}
          className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive hover:text-white transition-colors"
        >
          Delete My Account
        </button>
      </section>
    </div>
  );
}
