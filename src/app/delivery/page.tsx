"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Truck, LogIn, RefreshCw } from "lucide-react";
import { Order } from "@/lib/types";
import DeliveryCard from "@/components/DeliveryCard";

export default function DeliveryPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [storedPin, setStoredPin] = useState("");
  const [error, setError] = useState("");
  const [logging, setLogging] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { "x-admin-pin": storedPin },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [storedPin]);

  useEffect(() => {
    if (!authenticated) return;
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authenticated, fetchOrders]);

  const handleLogin = async () => {
    if (!pin.trim() || logging) return;
    setLogging(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.role) {
        setStoredPin(pin.trim());
        setAuthenticated(true);
      } else {
        setError(data.error || "Invalid PIN");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLogging(false);
    }
  };

  // Login view
  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <Truck size={32} color="var(--muted)" />
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                color: "var(--white)",
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Delivery Login
            </h1>
            <p
              style={{
                color: "var(--muted)",
                fontSize: 13,
                margin: "6px 0 0",
              }}
            >
              Enter your delivery PIN
            </p>
          </div>

          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            placeholder="****"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid var(--surface-border)",
              background: "var(--surface)",
              color: "var(--white)",
              fontSize: 20,
              fontFamily: "var(--font-inter), sans-serif",
              textAlign: "center",
              letterSpacing: 8,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div
              style={{
                color: "var(--error)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={logging || !pin.trim()}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "var(--red)",
              color: "var(--white)",
              fontWeight: 700,
              fontSize: 15,
              fontFamily: "var(--font-inter), sans-serif",
              cursor: logging || !pin.trim() ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: logging || !pin.trim() ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <LogIn size={16} />
            {logging ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  // Delivery list view
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* Sticky header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "rgba(10, 10, 10, 0.85)",
          borderBottom: "1px solid var(--surface-border)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Truck size={22} color="var(--yellow)" />
          <span
            style={{
              color: "var(--white)",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Deliveries
          </span>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "default" : "pointer",
            padding: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCw
            size={20}
            color="var(--muted)"
            style={{
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </header>

      {/* Orders list */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.length === 0 && !loading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
              padding: "60px 0",
            }}
          >
            No active deliveries
          </div>
        )}
        {orders.map((order) => (
          <DeliveryCard
            key={order.id}
            order={order}
            pin={storedPin}
            onUpdate={fetchOrders}
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
