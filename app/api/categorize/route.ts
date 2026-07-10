import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const DEFAULT_CATEGORIES = [
  "Food",
  "Drinks",
  "Transportation",
  "Bills",
  "Entertainment",
  "Savings",
  "Hygiene",
  "Cleaning",
  "Household",
  "Other",
];

/**
 * POST /api/categorize
 * 
 * Accepts { description: string, amount?: number, categories?: string[] }
 * Uses Gemini AI to auto-categorize an expense based on its description.
 * 
 * Returns { category: string, confidence: number, reasoning: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { description, amount, categories } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "No description provided" },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      // Fallback: simple keyword matching when no API key
      const category = fallbackCategorize(description);
      return NextResponse.json({
        category,
        confidence: 0.5,
        reasoning: "Fallback: Gemini API key not configured",
      });
    }

    const categoryList = categories && categories.length > 0
      ? categories
      : DEFAULT_CATEGORIES;

    const prompt = `You are an expense categorization AI. Given an expense description, categorize it into EXACTLY one of these categories: ${categoryList.join(", ")}

Expense: "${description}"${amount ? ` (amount: ${amount})` : ""}

Rules:
- Pick the single best matching category from the list above
- Be confident in your choice
- Consider the context: brand names, common spending patterns, and amount

Return ONLY valid JSON (no markdown, no code blocks):
{"category": "<exact category name from the list>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      const category = fallbackCategorize(description);
      return NextResponse.json({
        category,
        confidence: 0.4,
        reasoning: "Fallback: Gemini API unavailable",
      });
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      const category = fallbackCategorize(description);
      return NextResponse.json({
        category,
        confidence: 0.4,
        reasoning: "Fallback: No response from Gemini",
      });
    }

    // Clean markdown code fences if present
    let cleanJson = textContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleanJson);

    // Validate category is in the list
    const validCategory = categoryList.find(
      (c: string) => c.toLowerCase() === (parsed.category || "").toLowerCase()
    );

    return NextResponse.json({
      category: validCategory || parsed.category || "Other",
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.8)),
      reasoning: parsed.reasoning || "Categorized by Gemini AI",
    });
  } catch (error) {
    console.error("Categorize error:", error);
    return NextResponse.json(
      { error: "Failed to categorize expense" },
      { status: 500 }
    );
  }
}

/**
 * Simple keyword-based fallback when Gemini is unavailable
 */
function fallbackCategorize(description: string): string {
  const input = description.toLowerCase();

  const rules: [string[], string][] = [
    [["restaurant", "food", "lunch", "dinner", "breakfast", "pizza", "burger", "sushi", "mcdonalds", "kfc", "jollibee", "meal", "rice", "chicken", "pork", "beef", "noodle", "ramen"], "Food"],
    [["coffee", "starbucks", "tea", "juice", "soda", "water", "beer", "wine", "drink", "smoothie", "boba", "milk tea"], "Drinks"],
    [["uber", "lyft", "taxi", "gas", "fuel", "parking", "toll", "grab", "bus", "train", "fare", "jeep", "commute"], "Transportation"],
    [["electric", "water bill", "internet", "wifi", "phone bill", "rent", "mortgage", "netflix", "spotify", "subscription"], "Bills"],
    [["movie", "cinema", "game", "concert", "show", "ticket", "arcade", "karaoke", "bowling", "steam"], "Entertainment"],
    [["savings", "invest", "deposit", "transfer to savings"], "Savings"],
    [["shampoo", "soap", "toothpaste", "deodorant", "lotion", "tissue", "napkin", "sanitary"], "Hygiene"],
    [["detergent", "bleach", "cleaner", "mop", "broom", "sponge", "dishwash"], "Cleaning"],
    [["furniture", "repair", "bulb", "battery", "tool", "decoration", "curtain", "appliance"], "Household"],
  ];

  for (const [keywords, category] of rules) {
    if (keywords.some((kw) => input.includes(kw))) {
      return category;
    }
  }

  return "Other";
}
