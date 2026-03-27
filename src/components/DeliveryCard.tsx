"use client";

import { useState } from "react";
import { Phone, MapPin, Check } from "lucide-react";
import { Order } from "@/lib/types";

interface DeliveryCardProps {
  order: Order;
  pin: string;
  onUpdate: () => void;
}

export default function DeliveryCard({ order, pin, onUpdate }: DeliveryCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleDeliver = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": pin,
        },
        body: JSON.stringify({ status: "completed" }),
      });
      onUpdate();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const timestamp = new Date(order.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "var(--yellow)",
            fontWeight: 700,
            fontSize: 15,
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          #{order.order_number}
        </span>
        <span
          style={{
            color: "var(--muted)",
            fontSize: 12,
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          {timestamp}
        </span>
      </div>

      {/* Customer name */}
      <div
        style={{
          color: "var(--white)",
          fontWeight: 600,
          fontSize: 15,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        {order.customer_name}
      </div>

      {/* Phone */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--muted)",
          fontSize: 13,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <Phone size={12} />
        {order.customer_phone}
      </div>

      {/* Delivery location */}
      {order.delivery_location && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--yellow)",
            fontSize: 13,
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          <MapPin size={12} />
          {order.delivery_location}
        </div>
      )}

      {/* Items */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          fontSize: 12,
          color: "var(--muted)",
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        {order.items.map((item, i) => (
          <span
            key={i}
            style={{
              background: "var(--bg)",
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            {item.name} x{item.qty}
          </span>
        ))}
      </div>

      {/* Delivered button */}
      <button
        onClick={handleDeliver}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          border: "none",
          background: "var(--success)",
          color: "var(--white)",
          fontWeight: 700,
          fontSize: 15,
          fontFamily: "var(--font-inter), sans-serif",
          cursor: submitting ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: submitting ? 0.7 : 1,
          transition: "transform 0.1s, opacity 0.15s",
        }}
        onMouseDown={(e) => {
          if (!submitting) e.currentTarget.style.transform = "scale(0.97)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {submitting ? (
          "Updating..."
        ) : (
          <>
            <Check size={18} />
            Delivered
          </>
        )}
      </button>
    </div>
  );
}
