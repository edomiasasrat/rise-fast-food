import { NextRequest, NextResponse } from "next/server";
import { verifyPin, getConfig, setConfig } from "@/lib/db";

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || verifyPin(pin) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    telegram_bot_token: getConfig("telegram_bot_token") || "",
    telegram_chat_id: getConfig("telegram_chat_id") || "",
    estimated_wait: getConfig("estimated_wait") || "15",
  });
}

export async function PATCH(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (!pin || verifyPin(pin) !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowedKeys = ["telegram_bot_token", "telegram_chat_id", "estimated_wait"];

  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      setConfig(key, String(body[key]));
    }
  }

  return NextResponse.json({ ok: true });
}
