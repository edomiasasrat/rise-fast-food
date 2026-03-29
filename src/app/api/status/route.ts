import { NextResponse } from "next/server";
import { isOpen } from "@/lib/utils";
import { getConfig } from "@/lib/db";

export async function GET() {
  const estimatedWait = (await getConfig("estimated_wait")) || "15";
  return NextResponse.json({ open: isOpen(), estimated_wait: estimatedWait });
}
