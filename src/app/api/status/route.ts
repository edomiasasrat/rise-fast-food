import { NextResponse } from "next/server";
import { isOpen } from "@/lib/utils";

export async function GET() {
  return NextResponse.json({ open: isOpen() });
}
