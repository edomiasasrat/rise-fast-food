import { getConfig } from "./db";
import type { Order } from "./types";

export async function sendOrderNotification(order: Order): Promise<void> {
  try {
    const token = await getConfig("telegram_bot_token");
    const chatId = await getConfig("telegram_chat_id");

    if (!token || !chatId) return;

    const itemsList = order.items
      .map((item) => `  ${item.qty}x ${item.name} - ${item.price * item.qty} Birr`)
      .join("\n");

    const deliveryInfo =
      order.order_type === "delivery"
        ? `Delivery to: ${order.delivery_location}`
        : "Pickup";

    const message = [
      `🔔 New Order #${order.order_number}`,
      `${order.customer_name} - ${order.customer_phone}`,
      itemsList,
      `Total: ${order.total} Birr`,
      deliveryInfo,
    ].join("\n");

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
  } catch {
    // Silently skip if Telegram fails
  }
}

export async function sendTestNotification(): Promise<boolean> {
  try {
    const token = await getConfig("telegram_bot_token");
    const chatId = await getConfig("telegram_chat_id");

    if (!token || !chatId) return false;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Rise Fast Food - Test notification. Your Telegram alerts are working!",
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
