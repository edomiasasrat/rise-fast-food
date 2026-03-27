"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Order } from "@/lib/types";
import { LogIn, RefreshCw } from "lucide-react";
import AdminOrderCard from "@/components/AdminOrderCard";
import AudioNotifier from "@/components/AudioNotifier";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ orders_today: 0, revenue_today: 0, pending_count: 0 });
  const [loading, setLoading] = useState(false);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const knownIds = useRef<Set<number>>(new Set());
  const pinRef = useRef("");

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

      // Detect new orders
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

  useEffect(() => {
    if (!authed) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [authed, fetchOrders]);

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
          onClick={fetchOrders}
          disabled={loading}
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
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </header>

      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 16px",
          overflowX: "auto",
        }}
      >
        {[
          { label: "Orders Today", value: stats.orders_today, color: "var(--white)" },
          {
            label: "Revenue",
            value: `${stats.revenue_today.toLocaleString()} Br`,
            color: "var(--yellow)",
          },
          { label: "Pending", value: stats.pending_count, color: "var(--error)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 100,
              background: "var(--surface)",
              border: "1px solid var(--surface-border)",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 500 }}>
              {stat.label}
            </span>
            <span style={{ color: stat.color, fontSize: 20, fontWeight: 700 }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div
        style={{
          flex: 1,
          padding: "4px 16px 24px",
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
