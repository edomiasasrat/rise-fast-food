import { NextRequest, NextResponse } from "next/server";
import { verifyPin } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pin } = body;

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "pin is required" }, { status: 400 });
  }

  const role = verifyPin(pin);

  if (!role) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ role });
}
