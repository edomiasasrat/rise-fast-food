"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Order } from "@/lib/types";
import { LogIn, RefreshCw, Send, Plus, X } from "lucide-react";
import AdminOrderCard from "@/components/AdminOrderCard";
import AudioNotifier from "@/components/AudioNotifier";

type AdminTab = "orders" | "menu" | "settings";

interface MenuItemAdmin {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: number;
  sort_order: number;
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ count: 0, revenue: 0, pending: 0, inQueue: 0 });
  const [loading, setLoading] = useState(false);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const knownIds = useRef<Set<number>>(new Set());
  const pinRef = useRef("");

  const [activeTab, setActiveTab] = useState<AdminTab>("orders");

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItemAdmin[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", category: "food" });

  // Settings state
  const [settings, setSettings] = useState({
    telegram_bot_token: "",
    telegram_chat_id: "",
    estimated_wait: "15",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");

  async function handleLogin() {
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid PIN");
        return;
      }
      if (data.role !== "admin") {
        setError("Admin access required");
        return;
      }
      pinRef.current = pin;
      setAuthed(true);
    } catch {
      setError("Connection error");
    }
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { "x-admin-pin": pinRef.current },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fetched: Order[] = data.orders || [];

      const freshIds = new Set<number>();
      for (const o of fetched) {
        if (!knownIds.current.has(o.id)) {
          freshIds.add(o.id);
        }
        knownIds.current.add(o.id);
      }

      if (freshIds.size > 0) {
        setNewIds(freshIds);
        setTimeout(() => setNewIds(new Set()), 3000);
      }

      setOrders(fetched);
      if (data.stats) setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const res = await fetch("/api/admin/menu", {
        headers: { "x-admin-pin": pinRef.current },
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
      }
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-pin": pinRef.current },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          telegram_bot_token: data.telegram_bot_token || "",
          telegram_chat_id: data.telegram_chat_id || "",
          estimated_wait: data.estimated_wait || "15",
        });
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [authed, fetchOrders]);

  useEffect(() => {
    if (authed && activeTab === "menu") fetchMenu();
  }, [authed, activeTab, fetchMenu]);

  useEffect(() => {
    if (authed && activeTab === "settings") fetchSettings();
  }, [authed, activeTab, fetchSettings]);

  // Menu handlers
  const toggleItem = async (id: string, active: boolean) => {
    await fetch("/api/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": pinRef.current },
      body: JSON.stringify({ id, action: "toggle", active }),
    });
    fetchMenu();
  };

  const savePrice = async (id: string) => {
    const price = parseInt(editPriceVal);
    if (isNaN(price) || price <= 0) return;
    await fetch("/api/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": pinRef.current },
      body: JSON.stringify({ id, price }),
    });
    setEditingPrice(null);
    fetchMenu();
  };

  const addItem = async () => {
    if (!newItem.name || !newItem.description || !newItem.price) return;
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pinRef.current },
      body: JSON.stringify({
        name: newItem.name,
        description: newItem.description,
        price: parseInt(newItem.price),
        category: newItem.category,
      }),
    });
    if (res.ok) {
      setShowAddItem(false);
      setNewItem({ name: "", description: "", price: "", category: "food" });
      fetchMenu();
    }
  };

  // Settings handlers
  const saveSettings = async () => {
    setSettingsLoading(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": pinRef.current },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsMsg("Settings saved");
        setTimeout(() => setSettingsMsg(""), 2000);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const testNotification = async () => {
    setTestMsg("");
    try {
      const res = await fetch("/api/admin/settings/test-notification", {
        method: "POST",
        headers: { "x-admin-pin": pinRef.current },
      });
      if (res.ok) {
        setTestMsg("Test sent!");
      } else {
        const data = await res.json();
        setTestMsg(data.error || "Failed");
      }
      setTimeout(() => setTestMsg(""), 3000);
    } catch {
      setTestMsg("Network error");
      setTimeout(() => setTestMsg(""), 3000);
    }
  };

  // Login screen
  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--surface-border)",
            borderRadius: 16,
            padding: 32,
            width: "100%",
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: 36,
                color: "var(--red)",
                marginBottom: 4,
              }}
            >
              Rise
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Admin Dashboard</p>
          </div>

          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Enter PIN"
            style={{
              width: "100%",
              textAlign: "center",
              letterSpacing: 8,
              fontSize: 24,
              padding: "12px 16px",
              background: "var(--bg)",
              border: "1px solid var(--surface-border)",
              borderRadius: 10,
              color: "var(--white)",
              outline: "none",
            }}
          />

          {error && (
            <p style={{ color: "var(--error)", fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: "var(--red)",
              color: "var(--white)",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            <LogIn size={18} /> Log In
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AudioNotifier orderCount={orders.length} />

      {/* Sticky Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--surface)",
          borderBottom: "1px solid var(--surface-border)",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-pacifico), cursive",
              fontSize: 22,
              color: "var(--red)",
            }}
          >
            Rise
          </span>
          <span
            style={{
              background: "var(--red)20",
              color: "var(--red)",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Admin
          </span>
        </div>
        <button
          onClick={() => { if (activeTab === "orders") fetchOrders(); else if (activeTab === "menu") fetchMenu(); }}
          disabled={loading || menuLoading}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 4,
          }}
        >
          <RefreshCw
            size={20}
            style={{
              animation: (loading || menuLoading) ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </header>

      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          overflowX: "auto",
        }}
      >
        {[
          { label: "Orders", value: stats.count, color: "var(--white)" },
          { label: "Revenue", value: `${stats.revenue.toLocaleString()} Br`, color: "var(--yellow)" },
          { label: "Pending", value: stats.pending, color: "var(--error)" },
          { label: "In Queue", value: stats.inQueue, color: "var(--blue)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 80,
              background: "var(--surface)",
              border: "1px solid var(--surface-border)",
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 10, fontWeight: 500 }}>
              {stat.label}
            </span>
            <span style={{ color: stat.color, fontSize: 18, fontWeight: 700 }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 16px",
          borderBottom: "1px solid var(--surface-border)",
        }}
      >
        {(["orders", "menu", "settings"] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--red)" : "2px solid transparent",
              color: activeTab === tab ? "var(--white)" : "var(--muted)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div
          style={{
            flex: 1,
            padding: "12px 16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {orders.length === 0 && !loading && (
            <div
              style={{
                textAlign: "center",
                color: "var(--muted)",
                padding: "60px 0",
                fontSize: 15,
              }}
            >
              No orders yet
            </div>
          )}
          {orders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              pin={pinRef.current}
              onUpdate={fetchOrders}
              isNew={newIds.has(order.id)}
            />
          ))}
        </div>
      )}

      {/* MENU TAB */}
      {activeTab === "menu" && (
        <div style={{ flex: 1, padding: "12px 16px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {menuItems.length} items
            </span>
            <button
              onClick={() => setShowAddItem(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--red)",
                color: "var(--white)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--surface-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>New Item</span>
                <button onClick={() => setShowAddItem(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2 }}>
                  <X size={18} />
                </button>
              </div>
              <input
                placeholder="Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={adminInputStyle}
              />
              <input
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                style={adminInputStyle}
              />
              <input
                placeholder="Price (Birr)"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                style={adminInputStyle}
              />
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                style={{ ...adminInputStyle, cursor: "pointer" }}
              >
                <option value="food">Food</option>
                <option value="drink">Drink</option>
              </select>
              <button
                onClick={addItem}
                disabled={!newItem.name || !newItem.description || !newItem.price}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: newItem.name && newItem.description && newItem.price ? "var(--success)" : "#555",
                  color: "var(--white)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: newItem.name && newItem.description && newItem.price ? "pointer" : "not-allowed",
                }}
              >
                Add Item
              </button>
            </div>
          )}

          {/* Menu items list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  opacity: item.active ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>
                      {item.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.description}
                  </div>
                </div>

                {/* Price - editable */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {editingPrice === item.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        value={editPriceVal}
                        onChange={(e) => setEditPriceVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") savePrice(item.id); if (e.key === "Escape") setEditingPrice(null); }}
                        autoFocus
                        style={{
                          width: 60,
                          padding: "4px 6px",
                          background: "var(--bg)",
                          border: "1px solid var(--red)",
                          borderRadius: 6,
                          color: "var(--white)",
                          fontSize: 13,
                          textAlign: "center",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => savePrice(item.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: "var(--success)",
                          color: "#fff",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => { setEditingPrice(item.id); setEditPriceVal(String(item.price)); }}
                      style={{
                        color: "var(--yellow)",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "rgba(234,179,8,0.08)",
                      }}
                    >
                      {item.price} Br
                    </span>
                  )}

                  {/* Toggle active */}
                  <button
                    onClick={() => toggleItem(item.id, !item.active)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: item.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: item.active ? "var(--success)" : "var(--error)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.active ? "Active" : "Hidden"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div style={{ flex: 1, padding: "16px 16px 24px" }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--surface-border)",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Notification Settings</h3>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Telegram Bot Token</span>
              <input
                type="text"
                value={settings.telegram_bot_token}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                placeholder="123456:ABC-DEF..."
                style={adminInputStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Telegram Chat ID</span>
              <input
                type="text"
                value={settings.telegram_chat_id}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                placeholder="-1001234567890"
                style={adminInputStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Estimated Wait Time (minutes)</span>
              <input
                type="number"
                value={settings.estimated_wait}
                onChange={(e) => setSettings({ ...settings, estimated_wait: e.target.value })}
                placeholder="15"
                style={{ ...adminInputStyle, width: 100 }}
              />
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={saveSettings}
                disabled={settingsLoading}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--red)",
                  color: "var(--white)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {settingsLoading ? "Saving..." : "Save Settings"}
              </button>
              <button
                onClick={testNotification}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--surface-border)",
                  background: "transparent",
                  color: "var(--white)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <Send size={14} /> Test
              </button>
            </div>

            {settingsMsg && (
              <div style={{ color: "var(--success)", fontSize: 13 }}>{settingsMsg}</div>
            )}
            {testMsg && (
              <div style={{ color: testMsg.includes("sent") ? "var(--success)" : "var(--error)", fontSize: 13 }}>
                {testMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const adminInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--bg)",
  border: "1px solid var(--surface-border)",
  borderRadius: 8,
  color: "var(--white)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
