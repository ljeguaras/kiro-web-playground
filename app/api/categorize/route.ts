import { NextResponse } from "next/server";
import { categorizeExpense, categorizeExpenses } from "@/lib/ai-categorizer";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Single expense categorization
    if (body.description) {
      const result = categorizeExpense(body.description, body.amount);
      return NextResponse.json({
        success: true,
        data: {
          categoryId: result.category.id,
          categoryName: result.category.name,
          emoji: result.category.emoji,
          confidence: result.confidence,
          reasoning: result.reasoning,
        },
      });
    }

    // Batch categorization
    if (body.expenses && Array.isArray(body.expenses)) {
      const results = categorizeExpenses(body.expenses);
      return NextResponse.json({
        success: true,
        data: results.map((result) => ({
          categoryId: result.category.id,
          categoryName: result.category.name,
          emoji: result.category.emoji,
          confidence: result.confidence,
          reasoning: result.reasoning,
        })),
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide 'description' or 'expenses' array" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
