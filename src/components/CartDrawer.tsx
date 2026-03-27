"use client";

import { useEffect } from "react";
import type { CartItem } from "@/lib/types";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  total,
  onCheckout,
}: CartDrawerProps) {
  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "relative",
          background: "var(--surface)",
          borderRadius: "20px 20px 0 0",
          padding: "12px 20px 28px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "var(--surface-border)",
            margin: "0 auto 20px",
          }}
        />

        {/* Title */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--white)",
            marginBottom: 20,
          }}
        >
          Your Order
        </h2>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 14,
                borderBottom: "1px solid var(--surface-border)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--white)",
                  }}
                >
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {item.price} Birr x{item.qty}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--yellow)",
                }}
              >
                {item.price * item.qty} Birr
              </div>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--surface-border)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--white)" }}>
            Total
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--yellow)" }}>
            {total} Birr
          </span>
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "16px 0",
            background: "var(--red)",
            border: "none",
            borderRadius: 16,
            color: "var(--white)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-inter), sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--red-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--red)")
          }
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
