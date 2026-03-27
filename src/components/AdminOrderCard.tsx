"use client";

import { useState } from "react";
import { Order, OrderStatus } from "@/lib/types";
import {
  Check,
  X,
  ChefHat,
  Package,
  Truck,
} from "lucide-react";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_review: "var(--yellow)",
  confirmed: "var(--success)",
  preparing: "var(--blue)",
  ready: "var(--success)",
  out_for_delivery: "var(--blue)",
  completed: "var(--muted)",
  rejected: "var(--error)",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_review: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  rejected: "Rejected",
};

interface Props {
  order: Order;
  pin: string;
  onUpdate: () => void;
  isNew?: boolean;
}

export default function AdminOrderCard({ order, pin, onUpdate, isNew }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: OrderStatus, reject_reason?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": pin,
        },
        body: JSON.stringify({ status, reject_reason }),
      });
      if (res.ok) {
        setRejecting(false);
        setRejectReason("");
        onUpdate();
      }
    } finally {
      setLoading(false);
    }
  }

  const statusColor = STATUS_COLORS[order.status];
  const time = new Date(order.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${isNew ? "var(--yellow)" : "var(--surface-border)"}`,
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: isNew ? "pulse-dot 1s ease-in-out 3" : undefined,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--yellow)", fontWeight: 700, fontSize: 16 }}>
              #{order.order_number}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{time}</span>
          </div>
          <span
            style={{
              background: `${statusColor}20`,
              color: statusColor,
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Customer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{order.customer_name}</span>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{order.customer_phone}</span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {order.order_type === "delivery"
              ? `Delivery to ${order.delivery_location}`
              : "Pickup"}
          </span>
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {order.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span>
                {item.qty}x {item.name}
              </span>
              <span style={{ color: "var(--yellow)" }}>
                {(item.price * item.qty).toLocaleString()} Br
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--surface-border)",
              paddingTop: 6,
              marginTop: 2,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <span>Total</span>
            <span style={{ color: "var(--yellow)" }}>{order.total.toLocaleString()} Br</span>
          </div>
        </div>

        {/* Payment Screenshot */}
        {order.payment_screenshot && (
          <img
            src={order.payment_screenshot}
            alt="Payment"
            onClick={() => setLightbox(true)}
            style={{
              maxHeight: 120,
              objectFit: "cover",
              borderRadius: 8,
              cursor: "pointer",
              width: "100%",
            }}
          />
        )}

        {/* Reject reason (if rejected) */}
        {order.status === "rejected" && order.reject_reason && (
          <div
            style={{
              background: "var(--error)15",
              border: "1px solid var(--error)30",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--error)",
            }}
          >
            Rejected: {order.reject_reason}
          </div>
        )}

        {/* Actions */}
        {order.status === "pending_review" && !rejecting && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={loading}
              onClick={() => updateStatus("confirmed")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: "rgba(34,197,94,0.15)",
                color: "var(--success)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <Check size={16} /> Confirm
            </button>
            <button
              disabled={loading}
              onClick={() => setRejecting(true)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: "rgba(239,68,68,0.15)",
                color: "var(--error)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <X size={16} /> Reject
            </button>
          </div>
        )}

        {order.status === "pending_review" && rejecting && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--surface-border)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "var(--white)",
                fontSize: 14,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={loading || !rejectReason.trim()}
                onClick={() => updateStatus("rejected", rejectReason.trim())}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--error)",
                  color: "var(--white)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  opacity: rejectReason.trim() ? 1 : 0.5,
                }}
              >
                Reject Order
              </button>
              <button
                onClick={() => {
                  setRejecting(false);
                  setRejectReason("");
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--surface-border)",
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {order.status === "confirmed" && (
          <button
            disabled={loading}
            onClick={() => updateStatus("preparing")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "rgba(59,130,246,0.15)",
              color: "var(--blue)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <ChefHat size={16} /> Mark Preparing
          </button>
        )}

        {order.status === "preparing" && (
          <button
            disabled={loading}
            onClick={() =>
              updateStatus(order.order_type === "pickup" ? "ready" : "out_for_delivery")
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background:
                order.order_type === "pickup"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(59,130,246,0.15)",
              color: order.order_type === "pickup" ? "var(--success)" : "var(--blue)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {order.order_type === "pickup" ? (
              <>
                <Package size={16} /> Ready for Pickup
              </>
            ) : (
              <>
                <Truck size={16} /> Out for Delivery
              </>
            )}
          </button>
        )}

        {(order.status === "ready" || order.status === "out_for_delivery") && (
          <button
            disabled={loading}
            onClick={() => updateStatus("completed")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "rgba(34,197,94,0.15)",
              color: "var(--success)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <Check size={16} /> Mark Completed
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "none",
              border: "none",
              color: "var(--white)",
              cursor: "pointer",
            }}
          >
            <X size={28} />
          </button>
          <img
            src={order.payment_screenshot}
            alt="Payment screenshot"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      )}
    </>
  );
}
