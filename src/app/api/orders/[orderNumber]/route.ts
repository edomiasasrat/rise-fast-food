import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getOrderByNumber, updateOrderScreenshot } from "@/lib/db";

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
  const formData = await req.formData();

  // Issue 8: Require phone for authentication
  const customerPhone = formData.get("customer_phone") as string | null;
  if (!customerPhone) {
    return NextResponse.json(
      { error: "customer_phone is required for re-upload" },
      { status: 400 }
    );
  }

  const existing = await getOrderByNumber(orderNumber);

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Verify phone matches
  if (existing.customer_phone !== customerPhone) {
    return NextResponse.json(
      { error: "Phone number does not match order" },
      { status: 403 }
    );
  }

  // Verify order is rejected
  if (existing.status !== "rejected") {
    return NextResponse.json(
      { error: "Screenshots can only be re-uploaded for rejected orders" },
      { status: 400 }
    );
  }

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

  // Issue 7: Validate MIME type
  const ext = mimeToExt[screenshot.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only image files allowed (JPEG, PNG, WebP, GIF)" },
      { status: 400 }
    );
  }

  const filename = `rise-payments/${orderNumber}-${Date.now()}.${ext}`;

  const blob = await put(filename, screenshot, { access: "public" });

  const order = await updateOrderScreenshot(orderNumber, blob.url);

  return NextResponse.json({ order });
}
