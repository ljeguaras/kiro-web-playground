"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { preprocessImage, recognizeText, OcrProgress } from "@/lib/ocr";
import { ReceiptItem, ReceiptParseResult, Category } from "@/lib/types";
import {
  Camera,
  Upload,
  Loader2,
  Check,
  X,
  Save,
  AlertCircle,
} from "lucide-react";

type ScanStep = "upload" | "processing" | "review" | "saving" | "done" | "error";

export default function ScanPage() {
  const [step, setStep] = useState<ScanStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ status: "", progress: 0 });
  const [parseResult, setParseResult] = useState<ReceiptParseResult | null>(null);
  const [editingItems, setEditingItems] = useState<ReceiptItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function loadCategories() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);
    if (data) setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG)");
      return;
    }

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setStep("processing");
    setError(null);

    try {
      // Step 1: Preprocess image
      setOcrProgress({ status: "Preprocessing image...", progress: 0.1 });
      const processedImage = await preprocessImage(file);

      // Step 2: OCR
      setOcrProgress({ status: "Reading text from receipt...", progress: 0.2 });
      const ocrText = await recognizeText(processedImage, (progress) => {
        setOcrProgress({
          status: progress.status === "recognizing text"
            ? "Reading text from receipt..."
            : progress.status,
          progress: 0.2 + progress.progress * 0.4,
        });
      });

      if (!ocrText.trim()) {
        throw new Error("Could not read any text from the image. Please try a clearer photo.");
      }

      // Step 3: AI parsing
      setOcrProgress({ status: "AI analyzing receipt items...", progress: 0.7 });
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze receipt");
      }

      const result: ReceiptParseResult = await response.json();
      setOcrProgress({ status: "Done!", progress: 1 });

      setParseResult(result);
      setEditingItems(result.items);
      if (result.date) setDate(result.date);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process receipt");
      setStep("error");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function handleSave() {
    if (editingItems.length === 0) return;

    setStep("saving");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Map items to transactions
      const transactions = editingItems.map((item) => {
        const category = categories.find(
          (c) => c.name.toLowerCase() === item.category.toLowerCase()
        );
        return {
          user_id: user.id,
          category_id: category?.id || null,
          type: "expense" as const,
          amount: item.price,
          note: `${item.name}${parseResult?.merchant ? ` (${parseResult.merchant})` : ""}`,
          date,
        };
      });

      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactions);

      if (insertError) throw insertError;

      setStep("done");
      setTimeout(() => router.push("/transactions"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transactions");
      setStep("error");
    }
  }

  function updateItem(index: number, field: keyof ReceiptItem, value: string | number) {
    setEditingItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(index: number) {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetScan() {
    setStep("upload");
    setImagePreview(null);
    setParseResult(null);
    setEditingItems([]);
    setError(null);
    setOcrProgress({ status: "", progress: 0 });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Scan Receipt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Take a photo or upload a receipt. AI will identify items, expand abbreviations, and categorize them.
        </p>
      </header>

      {/* Upload Step */}
      {step === "upload" && (
        <section className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center hover:border-primary/50 transition-colors">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Take a photo or upload a receipt image
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Image
              </button>
            </div>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </section>
      )}

      {/* Processing Step */}
      {step === "processing" && (
        <section className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <div>
            <p className="font-medium">{ocrProgress.status}</p>
            <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${ocrProgress.progress * 100}%` }}
              />
            </div>
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Receipt preview"
              className="mx-auto mt-4 max-h-48 rounded-lg opacity-50"
            />
          )}
        </section>
      )}

      {/* Review Step */}
      {step === "review" && (
        <section className="space-y-4">
          {parseResult?.merchant && (
            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <span className="font-medium">Store:</span> {parseResult.merchant}
              {parseResult.date && (
                <span className="ml-4">
                  <span className="font-medium">Date:</span> {parseResult.date}
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Items Found ({editingItems.length})
              </h2>
              <div className="text-sm text-muted-foreground">
                Total: ${editingItems.reduce((s, i) => s + i.price, 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              {editingItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="w-full bg-transparent text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
                    />
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(index, "category", e.target.value)}
                      className="mt-1 text-xs bg-transparent border-none text-muted-foreground focus:outline-none"
                    >
                      {["Food", "Drinks", "Hygiene", "Cleaning", "Household", "Entertainment", "Transportation", "Bills", "Savings", "Other"].map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                    className="w-20 text-right text-sm font-medium bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={() => removeItem(index)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Transaction Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={editingItems.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save All ({editingItems.length} items)
            </button>
            <button
              onClick={resetScan}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Scan Another
            </button>
          </div>
        </section>
      )}

      {/* Saving Step */}
      {step === "saving" && (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 font-medium">Saving transactions...</p>
        </section>
      )}

      {/* Done Step */}
      {step === "done" && (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="mt-3 font-medium">All items saved successfully!</p>
          <p className="text-sm text-muted-foreground">Redirecting to transactions...</p>
        </section>
      )}

      {/* Error Step */}
      {step === "error" && (
        <section className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetScan}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/transactions/new")}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Enter Manually
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
