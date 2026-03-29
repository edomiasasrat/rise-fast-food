import { NextRequest, NextResponse } from "next/server";
import { verifyPin, getAllOrders, getDeliveryOrders, getTodayStats } from "@/lib/db";

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");

  if (!pin) {
    return NextResponse.json({ error: "x-admin-pin header is required" }, { status: 401 });
  }

  const role = await verifyPin(pin);

  if (!role) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  if (role === "delivery") {
    const orders = await getDeliveryOrders();
    return NextResponse.json({ orders });
  }

  const orders = await getAllOrders();
  const stats = await getTodayStats();
  return NextResponse.json({ orders, stats });
}
