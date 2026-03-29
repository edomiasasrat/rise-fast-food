import crypto from "crypto";

export function generateOrderNumber(): string {
  return `RSE-${Date.now().toString(36).toUpperCase()}`;
}

export function isOpen(): boolean {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  return hour >= 7 && hour < 19;
}

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update("rise-fast-food-salt:" + pin).digest("hex");
}
