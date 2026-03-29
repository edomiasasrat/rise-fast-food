import { createClient } from "@libsql/client";
import { Order, OrderStatus } from "./types";
import { hashPin } from "./utils";
import { menuItems as seedItems } from "./menu";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

let _initialized = false;

async function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  await initDb();
}

async function initDb() {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS rise_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        order_type TEXT NOT NULL CHECK(order_type IN ('pickup', 'delivery')),
        delivery_location TEXT,
        items TEXT NOT NULL,
        total INTEGER NOT NULL,
        payment_screenshot TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_review',
        reject_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS rise_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rise_menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('food', 'drink')),
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
    ],
    "write"
  );

  // Seed config if empty
  const configCheck = await client.execute({
    sql: "SELECT key FROM rise_config WHERE key = 'admin_pin_hash'",
    args: [],
  });

  if (configCheck.rows.length === 0) {
    await client.batch(
      [
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["admin_pin_hash", hashPin("1234")] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["delivery_pin_hash", hashPin("5678")] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["cbe_account", "1000XXXXXXXX"] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["telebirr_number", "09XXXXXXXX"] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["account_name", "Rise Fast Food"] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["telegram_bot_token", ""] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["telegram_chat_id", ""] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["estimated_wait", "15"] },
      ],
      "write"
    );
  } else {
    // Ensure new config keys exist for existing databases
    await client.batch(
      [
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["telegram_bot_token", ""] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["telegram_chat_id", ""] },
        { sql: "INSERT OR IGNORE INTO rise_config (key, value) VALUES (?, ?)", args: ["estimated_wait", "15"] },
      ],
      "write"
    );
  }

  // Seed menu_items if empty
  const menuCount = await client.execute({
    sql: "SELECT COUNT(*) as c FROM rise_menu_items",
    args: [],
  });
  const count = (menuCount.rows[0] as unknown as { c: number }).c;

  if (count === 0) {
    const stmts = seedItems.map((item, index) => ({
      sql: "INSERT INTO rise_menu_items (id, name, description, price, category, active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)",
      args: [item.id, item.name, item.description, item.price, item.category, index],
    }));
    await client.batch(stmts, "write");
  }
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as number,
    order_number: row.order_number as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    order_type: row.order_type as "pickup" | "delivery",
    delivery_location: row.delivery_location as string | null,
    items: JSON.parse(row.items as string),
    total: row.total as number,
    payment_screenshot: row.payment_screenshot as string,
    status: row.status as OrderStatus,
    reject_reason: row.reject_reason as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createOrder(data: {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: "pickup" | "delivery";
  delivery_location: string | null;
  items: string;
  total: number;
  payment_screenshot: string;
}): Promise<Order> {
  await ensureInit();
  await client.execute({
    sql: `INSERT INTO rise_orders (order_number, customer_name, customer_phone, order_type, delivery_location, items, total, payment_screenshot)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.order_number,
      data.customer_name,
      data.customer_phone,
      data.order_type,
      data.delivery_location,
      data.items,
      data.total,
      data.payment_screenshot,
    ],
  });
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders WHERE order_number = ?",
    args: [data.order_number],
  });
  return rowToOrder(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders WHERE order_number = ?",
    args: [orderNumber],
  });
  if (result.rows.length === 0) return null;
  return rowToOrder(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getAllOrders(): Promise<Order[]> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders ORDER BY created_at DESC",
    args: [],
  });
  return result.rows.map((row) => rowToOrder(row as unknown as Record<string, unknown>));
}

export async function getDeliveryOrders(): Promise<Order[]> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders WHERE status = 'out_for_delivery' ORDER BY updated_at DESC",
    args: [],
  });
  return result.rows.map((row) => rowToOrder(row as unknown as Record<string, unknown>));
}

export async function updateOrderStatus(id: number, status: OrderStatus, rejectReason?: string): Promise<Order | null> {
  await ensureInit();
  if (rejectReason) {
    await client.execute({
      sql: "UPDATE rise_orders SET status = ?, reject_reason = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, rejectReason, id],
    });
  } else {
    await client.execute({
      sql: "UPDATE rise_orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, id],
    });
  }
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToOrder(result.rows[0] as unknown as Record<string, unknown>);
}

export async function updateOrderScreenshot(orderNumber: string, screenshotUrl: string): Promise<Order | null> {
  await ensureInit();
  await client.execute({
    sql: "UPDATE rise_orders SET payment_screenshot = ?, status = 'pending_review', reject_reason = NULL, updated_at = datetime('now') WHERE order_number = ?",
    args: [screenshotUrl, orderNumber],
  });
  const result = await client.execute({
    sql: "SELECT * FROM rise_orders WHERE order_number = ?",
    args: [orderNumber],
  });
  if (result.rows.length === 0) return null;
  return rowToOrder(result.rows[0] as unknown as Record<string, unknown>);
}

export async function getTodayStats(): Promise<{ count: number; revenue: number; pending: number; inQueue: number }> {
  await ensureInit();
  const today = new Date().toISOString().split("T")[0];

  const countRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM rise_orders WHERE date(created_at) = ?",
    args: [today],
  });
  const revenueRes = await client.execute({
    sql: "SELECT COALESCE(SUM(total), 0) as r FROM rise_orders WHERE date(created_at) = ? AND status NOT IN ('rejected')",
    args: [today],
  });
  const pendingRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM rise_orders WHERE status = 'pending_review'",
    args: [],
  });
  const inQueueRes = await client.execute({
    sql: "SELECT COUNT(*) as c FROM rise_orders WHERE status NOT IN ('completed', 'rejected')",
    args: [],
  });

  return {
    count: Number((countRes.rows[0] as unknown as { c: number }).c),
    revenue: Number((revenueRes.rows[0] as unknown as { r: number }).r),
    pending: Number((pendingRes.rows[0] as unknown as { c: number }).c),
    inQueue: Number((inQueueRes.rows[0] as unknown as { c: number }).c),
  };
}

export async function getConfig(key: string): Promise<string | null> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT value FROM rise_config WHERE key = ?",
    args: [key],
  });
  if (result.rows.length === 0) return null;
  return (result.rows[0] as unknown as { value: string }).value;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await ensureInit();
  await client.execute({
    sql: "INSERT OR REPLACE INTO rise_config (key, value) VALUES (?, ?)",
    args: [key, value],
  });
}

export async function verifyPin(pin: string): Promise<"admin" | "delivery" | null> {
  await ensureInit();
  const hashed = hashPin(pin);
  const adminRes = await client.execute({
    sql: "SELECT value FROM rise_config WHERE key = 'admin_pin_hash'",
    args: [],
  });
  if (adminRes.rows.length > 0 && (adminRes.rows[0] as unknown as { value: string }).value === hashed) return "admin";

  const deliveryRes = await client.execute({
    sql: "SELECT value FROM rise_config WHERE key = 'delivery_pin_hash'",
    args: [],
  });
  if (deliveryRes.rows.length > 0 && (deliveryRes.rows[0] as unknown as { value: string }).value === hashed) return "delivery";

  return null;
}

/* ---- Menu Items DB functions ---- */

export interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: number;
  sort_order: number;
}

function rowToMenuItem(row: Record<string, unknown>): MenuItemRow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as number,
    category: row.category as string,
    active: row.active as number,
    sort_order: row.sort_order as number,
  };
}

export async function getActiveMenuItems(): Promise<MenuItemRow[]> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT * FROM rise_menu_items WHERE active = 1 ORDER BY sort_order ASC",
    args: [],
  });
  return result.rows.map((row) => rowToMenuItem(row as unknown as Record<string, unknown>));
}

export async function getAllMenuItems(): Promise<MenuItemRow[]> {
  await ensureInit();
  const result = await client.execute({
    sql: "SELECT * FROM rise_menu_items ORDER BY sort_order ASC",
    args: [],
  });
  return result.rows.map((row) => rowToMenuItem(row as unknown as Record<string, unknown>));
}

export async function updateMenuItem(id: string, fields: { name?: string; description?: string; price?: number; category?: string }): Promise<MenuItemRow | null> {
  await ensureInit();
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (fields.name !== undefined) { sets.push("name = ?"); vals.push(fields.name); }
  if (fields.description !== undefined) { sets.push("description = ?"); vals.push(fields.description); }
  if (fields.price !== undefined) { sets.push("price = ?"); vals.push(fields.price); }
  if (fields.category !== undefined) { sets.push("category = ?"); vals.push(fields.category); }
  if (sets.length === 0) return null;
  vals.push(id);
  await client.execute({
    sql: `UPDATE rise_menu_items SET ${sets.join(", ")} WHERE id = ?`,
    args: vals,
  });
  const result = await client.execute({
    sql: "SELECT * FROM rise_menu_items WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToMenuItem(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createMenuItem(data: { id: string; name: string; description: string; price: number; category: string }): Promise<MenuItemRow> {
  await ensureInit();
  const maxOrderRes = await client.execute({
    sql: "SELECT COALESCE(MAX(sort_order), 0) as m FROM rise_menu_items",
    args: [],
  });
  const maxOrder = (maxOrderRes.rows[0] as unknown as { m: number }).m;
  await client.execute({
    sql: "INSERT INTO rise_menu_items (id, name, description, price, category, active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)",
    args: [data.id, data.name, data.description, data.price, data.category, Number(maxOrder) + 1],
  });
  const result = await client.execute({
    sql: "SELECT * FROM rise_menu_items WHERE id = ?",
    args: [data.id],
  });
  return rowToMenuItem(result.rows[0] as unknown as Record<string, unknown>);
}

export async function toggleMenuItem(id: string, active: boolean): Promise<MenuItemRow | null> {
  await ensureInit();
  await client.execute({
    sql: "UPDATE rise_menu_items SET active = ? WHERE id = ?",
    args: [active ? 1 : 0, id],
  });
  const result = await client.execute({
    sql: "SELECT * FROM rise_menu_items WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToMenuItem(result.rows[0] as unknown as Record<string, unknown>);
}
