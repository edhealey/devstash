import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items";

// Full detail for one item, fetched by the item drawer on click. A route rather
// than a server action because the caller is a client component doing a plain
// read (see context/coding-standards.md).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Scope the read to the signed-in user, resolved from the session — never
  // from the request.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "You must be signed in." },
      { status: 401 }
    );
  }

  try {
    const item = await getItemDetail(userId, id);

    // Someone else's item and a nonexistent one answer identically.
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item }, { status: 200 });
  } catch (error) {
    console.error("[items] Failed to load item detail:", error);
    return NextResponse.json(
      { success: false, error: "Could not load this item." },
      { status: 500 }
    );
  }
}
