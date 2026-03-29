import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { isOpen, generateOrderNumber } from "@/lib/utils";
import { createOrder, getActiveMenuItems } from "@/lib/db";
import { sendOrderNotification } from "@/lib/notify";

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  // Issue 12: Input length limits
  if (customerName.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }
  if (customerPhone.length > 20) {
    return NextResponse.json({ error: "Phone too long" }, { status: 400 });
  }
  if (deliveryLocation && deliveryLocation.length > 200) {
    return NextResponse.json({ error: "Address too long" }, { status: 400 });
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

  let parsedItems: Array<{ id: string; name: string; price: number; qty: number }>;
  try {
    parsedItems = JSON.parse(itemsRaw);
    if (!Array.isArray(parsedItems) || parsedItems.length === 0 || parsedItems.length > 20) {
      throw new Error();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid items" },
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

  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Screenshot must be under 5MB" },
      { status: 400 }
    );
  }

  // Issue 3: Server-side price verification
  const dbMenuItems = await getActiveMenuItems();
  const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

  const verifiedItems: Array<{ id: string; name: string; price: number; qty: number }> = [];
  for (const item of parsedItems) {
    const dbItem = menuMap.get(item.id);
    if (!dbItem) {
      return NextResponse.json(
        { error: `Menu item not found: ${item.id}` },
        { status: 400 }
      );
    }
    verifiedItems.push({
      id: dbItem.id,
      name: dbItem.name,
      price: dbItem.price,
      qty: item.qty,
    });
  }

  const total = verifiedItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const orderNumber = generateOrderNumber();
  const filename = `rise-payments/${orderNumber}-${Date.now()}.${ext}`;

  // Issue 2: Upload blob, then create DB record; if DB fails, delete blob
  const blob = await put(filename, screenshot, { access: "public" });

  let order;
  try {
    order = await createOrder({
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_type: orderType,
      delivery_location: deliveryLocation || null,
      items: JSON.stringify(verifiedItems),
      total,
      payment_screenshot: blob.url,
    });
  } catch (err) {
    // DB write failed — clean up the uploaded blob
    await del(blob.url).catch(() => {});
    throw err;
  }

  // Send Telegram notification (non-blocking)
  sendOrderNotification(order).catch(() => {});

  return NextResponse.json({ order }, { status: 201 });
}
