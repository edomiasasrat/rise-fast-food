import { NextRequest, NextResponse } from "next/server";
import { verifyPin } from "@/lib/db";
import { sendTestNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || verifyPin(pin) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const success = await sendTestNotification();
  if (!success) {
    return NextResponse.json(
      { error: "Failed to send test notification. Check your Telegram token and chat ID." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
