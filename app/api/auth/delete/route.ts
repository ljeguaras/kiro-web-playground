import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth";
import { deleteUser } from "@/lib/store";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all user data from the store
    deleteUser(session.userId);

    // Clear the session cookie
    await deleteSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
