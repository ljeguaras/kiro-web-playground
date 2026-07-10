import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCategories, addCategory, deleteCategory } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = getCategories(session.userId);
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const category = addCategory(session.userId, name);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Add category error:", error);
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
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Explicit ownership check: verify the category belongs to this user
    const userCategories = getCategories(session.userId);
    const ownsResource = userCategories.some((c) => c.id === id);
    if (!ownsResource) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const deleted = deleteCategory(session.userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
