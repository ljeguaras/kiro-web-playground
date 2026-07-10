import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTransactions, addTransaction, deleteTransaction } from "@/lib/store";

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
        { error: "Transaction ID is required" },
        { status: 400 }
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
