export type OrderStatus =
  | "pending_review"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "rejected";

export type OrderType = "pickup" | "delivery";

export type Role = "admin" | "delivery";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "food" | "drink";
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: OrderType;
  delivery_location: string | null;
  items: CartItem[];
  total: number;
  payment_screenshot: string;
  status: OrderStatus;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  delivery_location: string | null;
  items: string;
  total: number;
  payment_screenshot: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}
