import { NextRequest, NextResponse } from "next/server";
import { verifyPin, updateOrderStatus } from "@/lib/db";
import { OrderStatus } from "@/lib/types";

const VALID_STATUSES: OrderStatus[] = [
  "pending_review",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "rejected",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = req.headers.get("x-admin-pin");

  if (!pin) {
    return NextResponse.json({ error: "x-admin-pin header is required" }, { status: 401 });
  }

  const role = await verifyPin(pin);

  if (!role) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await req.json();
  const { status, reject_reason } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (status === "rejected" && !reject_reason) {
    return NextResponse.json(
      { error: "reject_reason is required when status is 'rejected'" },
      { status: 400 }
    );
  }

  const order = await updateOrderStatus(orderId, status, reject_reason);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
