import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getOrderByNumber, updateOrderScreenshot } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const existing = await getOrderByNumber(orderNumber);

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.status !== "rejected") {
    return NextResponse.json(
      { error: "Screenshots can only be re-uploaded for rejected orders" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const screenshot = formData.get("payment_screenshot") as File | null;

  if (!screenshot) {
    return NextResponse.json(
      { error: "payment_screenshot file is required" },
      { status: 400 }
    );
  }

  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Screenshot must be under 5MB" },
      { status: 400 }
    );
  }

  const ext = screenshot.name.split(".").pop() || "png";
  const filename = `rise-payments/${orderNumber}-${Date.now()}.${ext}`;

  const blob = await put(filename, screenshot, { access: "public" });

  const order = await updateOrderScreenshot(orderNumber, blob.url);

  return NextResponse.json({ order });
}
