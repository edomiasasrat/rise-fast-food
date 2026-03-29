import crypto from "crypto";

export function generateOrderNumber(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `RSE-${num}`;
}

export function isOpen(): boolean {
  const now = new Date();
  // Ethiopia is UTC+3 (Africa/Addis_Ababa)
  const ethTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" }));
  const hour = ethTime.getHours();
  return hour >= 7 && hour < 19;
}

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}
