import { NextResponse } from "next/server";
import { isOpen } from "@/lib/utils";
import { getConfig } from "@/lib/db";

export async function GET() {
  const [estimatedWait, cbeAccount, telebirrNumber, accountName] = await Promise.all([
    getConfig("estimated_wait"),
    getConfig("cbe_account"),
    getConfig("telebirr_number"),
    getConfig("account_name"),
  ]);

  return NextResponse.json({
    open: isOpen(),
    estimated_wait: estimatedWait || "15",
    payment_config: {
      cbe_account: cbeAccount || "",
      telebirr_number: telebirrNumber || "",
      account_name: accountName || "",
    },
  });
}
