import Database from "better-sqlite3";
import path from "path";
import { Order, OrderRow, OrderStatus } from "./types";
import { hashPin } from "./utils";

const dbPath = path.join(process.cwd(), "database.sqlite");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
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
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const existing = db.prepare("SELECT key FROM config WHERE key = 'admin_pin_hash'").get();
  if (!existing) {
    const stmt = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");
    stmt.run("admin_pin_hash", hashPin("1234"));
    stmt.run("delivery_pin_hash", hashPin("5678"));
    stmt.run("cbe_account", "1000XXXXXXXX");
    stmt.run("telebirr_number", "09XXXXXXXX");
    stmt.run("account_name", "Rise Fast Food");
  }
}

function rowToOrder(row: OrderRow): Order {
  return {
    ...row,
    items: JSON.parse(row.items),
    status: row.status as OrderStatus,
    order_type: row.order_type as "pickup" | "delivery",
  };
}

export function createOrder(data: {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: "pickup" | "delivery";
  delivery_location: string | null;
  items: string;
  total: number;
  payment_screenshot: string;
}): Order {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO orders (order_number, customer_name, customer_phone, order_type, delivery_location, items, total, payment_screenshot)
    VALUES (@order_number, @customer_name, @customer_phone, @order_type, @delivery_location, @items, @total, @payment_screenshot)
  `);
  stmt.run(data);
  const row = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(data.order_number) as OrderRow;
  return rowToOrder(row);
}

export function getOrderByNumber(orderNumber: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function getAllOrders(): Order[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as OrderRow[];
  return rows.map(rowToOrder);
}

export function getDeliveryOrders(): Order[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM orders WHERE status = 'out_for_delivery' ORDER BY updated_at DESC").all() as OrderRow[];
  return rows.map(rowToOrder);
}

export function updateOrderStatus(id: number, status: OrderStatus, rejectReason?: string): Order | null {
  const db = getDb();
  if (rejectReason) {
    db.prepare("UPDATE orders SET status = ?, reject_reason = ?, updated_at = datetime('now') WHERE id = ?").run(status, rejectReason, id);
  } else {
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function updateOrderScreenshot(orderNumber: string, screenshotPath: string): Order | null {
  const db = getDb();
  db.prepare("UPDATE orders SET payment_screenshot = ?, status = 'pending_review', reject_reason = NULL, updated_at = datetime('now') WHERE order_number = ?").run(screenshotPath, orderNumber);
  const row = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function getTodayStats(): { count: number; revenue: number; pending: number } {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const count = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ?").get(today) as { c: number }).c;
  const revenue = (db.prepare("SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE date(created_at) = ? AND status NOT IN ('rejected')").get(today) as { r: number }).r;
  const pending = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending_review'").get() as { c: number }).c;
  return { count, revenue, pending };
}

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function verifyPin(pin: string): "admin" | "delivery" | null {
  const db = getDb();
  const hashed = hashPin(pin);
  const adminHash = (db.prepare("SELECT value FROM config WHERE key = 'admin_pin_hash'").get() as { value: string } | undefined)?.value;
  if (adminHash === hashed) return "admin";
  const deliveryHash = (db.prepare("SELECT value FROM config WHERE key = 'delivery_pin_hash'").get() as { value: string } | undefined)?.value;
  if (deliveryHash === hashed) return "delivery";
  return null;
}
