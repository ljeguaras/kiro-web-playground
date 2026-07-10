import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBudgets, addBudget, deleteBudget } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgets = getBudgets(session.userId);
  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category_id, month, amount } = body;

    if (!category_id || !month || amount === undefined) {
      return NextResponse.json(
        { error: "category_id, month, and amount are required" },
        { status: 400 }
      );
    }

    const budget = addBudget(session.userId, {
      category_id,
      month,
      amount: Number(amount),
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Add budget error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Budget ID is required" },
        { status: 400 }
      );
    }

    const deleted = deleteBudget(session.userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
