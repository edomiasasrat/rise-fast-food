"use client";

import { useEffect, useState } from "react";

interface TopBarProps {
  onMyOrders: () => void;
}

export default function TopBar({ onMyOrders }: TopBarProps) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setIsOpen(data.open === true);
      } catch {
        setIsOpen(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(10, 10, 10, 0.85)",
        borderBottom: "1px solid var(--surface-border)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: Logo */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-pacifico), cursive",
            fontSize: 28,
            color: "var(--red)",
            lineHeight: 1,
          }}
        >
          Rise
        </div>
        <div
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 3,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          fast food
        </div>
      </div>

      {/* Right: Status + My Orders */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Open/Closed badge */}
        {isOpen !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: isOpen ? "var(--success)" : "var(--error)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isOpen ? "var(--success)" : "var(--error)",
                display: "inline-block",
                animation: isOpen ? "pulse-dot 2s ease-in-out infinite" : "none",
              }}
            />
            {isOpen ? "Open" : "Closed"}
          </div>
        )}

        {/* My Orders button */}
        <button
          onClick={onMyOrders}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--font-inter), sans-serif",
            padding: "4px 0",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--white)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          My Orders
        </button>
      </div>
    </header>
  );
}
