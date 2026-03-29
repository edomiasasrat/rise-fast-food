import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isOpen, generateOrderNumber } from "@/lib/utils";
import { createOrder } from "@/lib/db";
import { sendOrderNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  if (!isOpen()) {
    return NextResponse.json(
      { error: "We are currently closed. Orders accepted 7 AM - 7 PM." },
      { status: 403 }
    );
  }

  const formData = await req.formData();

  const customerName = formData.get("customer_name") as string | null;
  const customerPhone = formData.get("customer_phone") as string | null;
  const orderType = formData.get("order_type") as string | null;
  const deliveryLocation = formData.get("delivery_location") as string | null;
  const itemsRaw = formData.get("items") as string | null;
  const screenshot = formData.get("payment_screenshot") as File | null;

  if (!customerName || !customerPhone || !orderType || !itemsRaw || !screenshot) {
    return NextResponse.json(
      { error: "Missing required fields: customer_name, customer_phone, order_type, items, payment_screenshot" },
      { status: 400 }
    );
  }

  if (orderType !== "pickup" && orderType !== "delivery") {
    return NextResponse.json(
      { error: "order_type must be 'pickup' or 'delivery'" },
      { status: 400 }
    );
  }

  if (orderType === "delivery" && !deliveryLocation) {
    return NextResponse.json(
      { error: "delivery_location is required for delivery orders" },
      { status: 400 }
    );
  }

  let items;
  try {
    items = JSON.parse(itemsRaw);
    if (!Array.isArray(items) || items.length === 0) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "items must be a non-empty JSON array" },
      { status: 400 }
    );
  }

  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Screenshot must be under 5MB" },
      { status: 400 }
    );
  }

  const orderNumber = generateOrderNumber();
  const ext = screenshot.name.split(".").pop() || "png";
  const filename = `rise-payments/${orderNumber}-${Date.now()}.${ext}`;

  const blob = await put(filename, screenshot, { access: "public" });

  const total = items.reduce(
    (sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty,
    0
  );

  const order = await createOrder({
    order_number: orderNumber,
    customer_name: customerName,
    customer_phone: customerPhone,
    order_type: orderType,
    delivery_location: deliveryLocation || null,
    items: JSON.stringify(items),
    total,
    payment_screenshot: blob.url,
  });

  // Send Telegram notification (non-blocking)
  sendOrderNotification(order).catch(() => {});

  return NextResponse.json({ order }, { status: 201 });
}
