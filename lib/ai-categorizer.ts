import { getGeminiModel } from "./gemini";
import { CATEGORIES, type Category, getCategoryById } from "./categories";

export interface CategorizationResult {
  category: Category;
  confidence: number;
  reasoning: string;
}

export interface OCRExpenseItem {
  description: string;
  amount: number;
  category: Category;
  confidence: number;
  reasoning: string;
}

const CATEGORY_LIST = CATEGORIES.map((c) => `${c.id}: ${c.name}`).join(", ");

/**
 * Categorize a single expense using Google Gemini AI.
 * Gemini understands context, slang, brands, and ambiguity far better than keyword matching.
 */
export async function categorizeExpense(
  description: string,
  amount?: number
): Promise<CategorizationResult> {
  if (!description.trim()) {
    return {
      category: getCategoryById("other"),
      confidence: 0,
      reasoning: "No description provided",
    };
  }

  try {
    const model = getGeminiModel();

    const prompt = `You are an expense categorization AI. Categorize the following expense into exactly ONE of these categories:

Categories: ${CATEGORY_LIST}

Expense: "${description}"${amount ? ` ($${amount})` : ""}

Respond ONLY with valid JSON (no markdown, no code fences):
{"categoryId": "<category-id>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON response - handle potential markdown code fences
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const category = getCategoryById(parsed.categoryId);
    return {
      category,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.8)),
      reasoning: parsed.reasoning ?? "Categorized by Gemini AI",
    };
  } catch (error) {
    console.error("Gemini categorization error:", error);
    // Fallback to simple keyword matching if Gemini fails
    return fallbackCategorize(description);
  }
}

/**
 * Batch categorize multiple expenses in a single Gemini call (more efficient).
 */
export async function categorizeExpenses(
  expenses: { description: string; amount?: number }[]
): Promise<CategorizationResult[]> {
  if (expenses.length === 0) return [];

  try {
    const model = getGeminiModel();

    const expenseList = expenses
      .map((e, i) => `${i + 1}. "${e.description}"${e.amount ? ` ($${e.amount})` : ""}`)
      .join("\n");

    const prompt = `You are an expense categorization AI. Categorize each expense into exactly ONE of these categories:

Categories: ${CATEGORY_LIST}

Expenses:
${expenseList}

Respond ONLY with a valid JSON array (no markdown, no code fences). Each item must have:
[{"categoryId": "<category-id>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}, ...]

Return exactly ${expenses.length} items in the same order as the input.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed) || parsed.length !== expenses.length) {
      throw new Error("Invalid response length from Gemini");
    }

    return parsed.map((item: { categoryId?: string; confidence?: number; reasoning?: string }) => ({
      category: getCategoryById(item.categoryId ?? "other"),
      confidence: Math.min(1, Math.max(0, item.confidence ?? 0.8)),
      reasoning: item.reasoning ?? "Categorized by Gemini AI",
    }));
  } catch (error) {
    console.error("Gemini batch categorization error:", error);
    // Fallback: categorize individually with keyword matching
    return expenses.map((e) => fallbackCategorize(e.description));
  }
}

/**
 * OCR + Categorize: Extract expense items from a receipt image using Gemini Vision.
 * Gemini reads the receipt, extracts line items with amounts, and categorizes each.
 */
export async function extractExpensesFromReceipt(
  imageBase64: string,
  mimeType: string
): Promise<OCRExpenseItem[]> {
  try {
    const model = getGeminiModel();

    const prompt = `You are a receipt OCR and expense categorization AI.

Analyze this receipt image and extract ALL individual line items with their amounts.
Then categorize each item into one of these categories: ${CATEGORY_LIST}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "store": "<store name if visible>",
  "date": "<date if visible, ISO format>",
  "items": [
    {
      "description": "<item description>",
      "amount": <number>,
      "categoryId": "<category-id>",
      "confidence": <0.0-1.0>,
      "reasoning": "<why this category>"
    }
  ],
  "total": <total amount if visible>
}

If you cannot read the receipt clearly, return: {"error": "Cannot read receipt", "items": []}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (parsed.error || !parsed.items || parsed.items.length === 0) {
      return [];
    }

    return parsed.items.map(
      (item: { description: string; amount: number; categoryId?: string; confidence?: number; reasoning?: string }) => ({
        description: item.description,
        amount: item.amount,
        category: getCategoryById(item.categoryId ?? "other"),
        confidence: Math.min(1, Math.max(0, item.confidence ?? 0.8)),
        reasoning: item.reasoning ?? "Extracted from receipt by Gemini AI",
      })
    );
  } catch (error) {
    console.error("Gemini OCR error:", error);
    return [];
  }
}

/**
 * Fallback: Simple keyword-based categorization when Gemini is unavailable.
 */
function fallbackCategorize(description: string): CategorizationResult {
  const input = description.toLowerCase().trim();

  for (const category of CATEGORIES) {
    if (category.id === "other") continue;
    for (const keyword of category.keywords) {
      if (input.includes(keyword.toLowerCase())) {
        return {
          category,
          confidence: 0.6,
          reasoning: `Fallback: matched keyword "${keyword}"`,
        };
      }
    }
  }

  return {
    category: getCategoryById("other"),
    confidence: 0.1,
    reasoning: "No matching category found (Gemini unavailable)",
  };
}
