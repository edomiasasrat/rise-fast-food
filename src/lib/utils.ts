import crypto from "crypto";

export function generateOrderNumber(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `RSE-${num}`;
}

export function isOpen(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 7 && hour < 19;
}

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}
