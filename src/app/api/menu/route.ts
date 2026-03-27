import { NextResponse } from "next/server";
import { menuItems } from "@/lib/menu";

export async function GET() {
  return NextResponse.json({ items: menuItems });
}
