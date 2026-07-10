import { NextResponse } from "next/server";
import {
  categorizeExpense,
  categorizeExpenses,
  extractExpensesFromReceipt,
} from "@/lib/ai-categorizer";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Handle multipart form data (receipt image upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("receipt") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No receipt image provided" },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: "Unsupported image format. Use JPEG, PNG, WebP, or HEIC." },
          { status: 400 }
        );
      }

      // Convert to base64 for Gemini
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const items = await extractExpensesFromReceipt(base64, file.type);

      return NextResponse.json({
        success: true,
        type: "ocr",
        data: items.map((item) => ({
          description: item.description,
          amount: item.amount,
          categoryId: item.category.id,
          categoryName: item.category.name,
          emoji: item.category.emoji,
          confidence: item.confidence,
          reasoning: item.reasoning,
        })),
      });
    }

    // Handle JSON body (text-based categorization)
    const body = await request.json();

    // Single expense categorization
    if (body.description) {
      const result = await categorizeExpense(body.description, body.amount);
      return NextResponse.json({
        success: true,
        type: "categorize",
        data: {
          categoryId: result.category.id,
          categoryName: result.category.name,
          emoji: result.category.emoji,
          color: result.category.color,
          confidence: result.confidence,
          reasoning: result.reasoning,
        },
      });
    }

    // Batch categorization
    if (body.expenses && Array.isArray(body.expenses)) {
      const results = await categorizeExpenses(body.expenses);
      return NextResponse.json({
        success: true,
        type: "batch",
        data: results.map((result) => ({
          categoryId: result.category.id,
          categoryName: result.category.name,
          emoji: result.category.emoji,
          color: result.category.color,
          confidence: result.confidence,
          reasoning: result.reasoning,
        })),
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide 'description', 'expenses' array, or upload a receipt image" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Categorize API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
