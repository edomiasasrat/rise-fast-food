import { NextRequest, NextResponse } from "next/server";
import { verifyPin, getAllMenuItems, createMenuItem, updateMenuItem, toggleMenuItem } from "@/lib/db";

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || (await verifyPin(pin)) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getAllMenuItems();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || (await verifyPin(pin)) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, price, category } = body;

  if (!name || !description || !price || !category) {
    return NextResponse.json({ error: "name, description, price, and category are required" }, { status: 400 });
  }

  if (category !== "food" && category !== "drink") {
    return NextResponse.json({ error: "category must be 'food' or 'drink'" }, { status: 400 });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const item = await createMenuItem({ id, name, description, price: Number(price), category });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || (await verifyPin(pin)) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (action === "toggle") {
    const item = await toggleMenuItem(id, fields.active);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ item });
  }

  const item = await updateMenuItem(id, fields);
  if (!item) return NextResponse.json({ error: "Item not found or no changes" }, { status: 404 });
  return NextResponse.json({ item });
}
