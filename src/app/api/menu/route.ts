import { NextResponse } from "next/server";
import { getActiveMenuItems } from "@/lib/db";

export async function GET() {
  const rows = await getActiveMenuItems();
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    category: r.category,
  }));
  return NextResponse.json({ items });
}
