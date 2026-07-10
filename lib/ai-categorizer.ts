import { CATEGORIES, type Category } from "./categories";

interface CategorizationResult {
  category: Category;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * AI-powered expense categorization engine.
 * Uses NLP-inspired keyword matching, fuzzy matching, and weighted scoring
 * to automatically determine the category of an expense from its description.
 *
 * No external API calls needed — runs entirely client/server-side.
 * For production, this can be enhanced with an LLM API call.
 */
export function categorizeExpense(description: string, amount?: number): CategorizationResult {
  const input = description.toLowerCase().trim();

  if (!input) {
    return {
      category: CATEGORIES[CATEGORIES.length - 1], // "Other"
      confidence: 0,
      reasoning: "No description provided",
    };
  }

  const scores: { category: Category; score: number; matchedKeywords: string[] }[] = [];

  for (const category of CATEGORIES) {
    if (category.id === "other") continue;

    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of category.keywords) {
      const kw = keyword.toLowerCase();

      // Exact word match (highest weight)
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
      if (wordBoundaryRegex.test(input)) {
        score += 3;
        matchedKeywords.push(keyword);
        continue;
      }

      // Partial/substring match (medium weight)
      if (input.includes(kw)) {
        score += 2;
        matchedKeywords.push(keyword);
        continue;
      }

      // Fuzzy match — check if keyword appears with minor typos (low weight)
      if (kw.length > 4 && fuzzyMatch(input, kw)) {
        score += 1;
        matchedKeywords.push(`~${keyword}`);
      }
    }

    // Amount-based heuristics for ambiguous cases
    if (amount !== undefined) {
      // Large amounts are more likely bills/travel
      if (amount > 500 && (category.id === "travel" || category.id === "bills-utilities")) {
        score += 0.5;
      }
      // Small amounts are more likely food/coffee
      if (amount < 15 && category.id === "food-dining") {
        score += 0.5;
      }
    }

    if (score > 0) {
      scores.push({ category, score, matchedKeywords });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      category: CATEGORIES[CATEGORIES.length - 1],
      confidence: 0.1,
      reasoning: `Could not match "${description}" to any known category`,
    };
  }

  const best = scores[0];
  const maxPossibleScore = best.category.keywords.length * 3;
  const confidence = Math.min(0.99, best.score / Math.max(maxPossibleScore, 6));

  return {
    category: best.category,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Matched keywords: ${best.matchedKeywords.join(", ")}`,
  };
}

/**
 * Batch categorize multiple expenses
 */
export function categorizeExpenses(
  expenses: { description: string; amount?: number }[]
): CategorizationResult[] {
  return expenses.map((e) => categorizeExpense(e.description, e.amount));
}

/**
 * Simple fuzzy matching — checks if characters of keyword appear in order within input
 * with at most 1 character difference
 */
function fuzzyMatch(input: string, keyword: string): boolean {
  let matchCount = 0;
  let inputIdx = 0;

  for (let i = 0; i < keyword.length && inputIdx < input.length; i++) {
    const idx = input.indexOf(keyword[i], inputIdx);
    if (idx !== -1 && idx - inputIdx <= 2) {
      matchCount++;
      inputIdx = idx + 1;
    }
  }

  return matchCount / keyword.length >= 0.8;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
