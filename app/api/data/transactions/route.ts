import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTransactions,
  addTransaction,
  addTransactions,
  deleteTransaction,
} from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = getTransactions(session.userId);
  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Support batch creation: if body is an array, create all transactions atomically
    if (Array.isArray(body)) {
      // Validate all items before processing
      for (const item of body) {
        if (!item.type || item.amount === undefined || !item.date) {
          return NextResponse.json(
            { error: "Each item must have type, amount, and date" },
            { status: 400 }
          );
        }
        if (item.type !== "income" && item.type !== "expense") {
          return NextResponse.json(
            { error: "type must be 'income' or 'expense'" },
            { status: 400 }
          );
        }
      }

      const items = body.map((item) => ({
        category_id: item.category_id || null,
        type: item.type as "income" | "expense",
        amount: Number(item.amount),
        note: item.note || null,
        date: item.date,
      }));

      const transactions = addTransactions(session.userId, items);
      return NextResponse.json(transactions, { status: 201 });
    }

    // Single transaction creation
    const { category_id, type, amount, note, date } = body;

    if (!type || amount === undefined || !date) {
      return NextResponse.json(
        { error: "type, amount, and date are required" },
        { status: 400 }
      );
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    const transaction = addTransaction(session.userId, {
      category_id: category_id || null,
      type,
      amount: Number(amount),
      note: note || null,
      date,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Add transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Explicit ownership check: verify the transaction belongs to this user
    const userTransactions = getTransactions(session.userId);
    const ownsResource = userTransactions.some((t) => t.id === id);
    if (!ownsResource) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const deleted = deleteTransaction(session.userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
