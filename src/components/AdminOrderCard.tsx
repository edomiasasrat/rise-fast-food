"use client";

import { useState } from "react";
import { Order, OrderStatus } from "@/lib/types";
import {
  Check,
  X,
  ChefHat,
  Package,
  Truck,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Phone,
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
  out_for_delivery: "Delivering",
  completed: "Done",
  rejected: "Rejected",
};

interface Props {
  order: Order;
  pin: string;
  onUpdate: () => void;
  isNew?: boolean;
}

export default function AdminOrderCard({ order, pin, onUpdate, isNew }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  const itemSummary = order.items.map((i) => `${i.qty}x ${i.name}`).join(", ");

  // ===== COMPACT TILE =====
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          background: "var(--surface)",
          border: `1px solid ${isNew ? "var(--yellow)" : "var(--surface-border)"}`,
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          animation: isNew ? "pulse-dot 1s ease-in-out 3" : undefined,
          transition: "border-color 0.2s",
        }}
      >
        {/* Status dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: statusColor,
          flexShrink: 0,
          animation: order.status === "pending_review" ? "pulse-dot 2s infinite" : "none",
        }} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--yellow)" }}>
              #{order.order_number}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{time}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--white)", fontWeight: 500 }}>
            {order.customer_name}
          </div>
          <div style={{
            fontSize: 12,
            color: "var(--muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {itemSummary}
          </div>
        </div>

        {/* Right side: total + status + arrow */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--yellow)" }}>
            {order.total} Br
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            padding: "1px 8px",
            borderRadius: 10,
            background: `${statusColor}15`,
          }}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        <ChevronRight size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
      </div>
    );
  }

  // ===== EXPANDED DETAIL VIEW =====
  return (
    <>
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "var(--bg)",
        overflowY: "auto",
        animation: "slideIn 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--surface-border)",
        }}>
          <button
            onClick={() => { setExpanded(false); setRejecting(false); }}
            style={{ background: "none", border: "none", color: "var(--white)", cursor: "pointer", padding: 4, display: "flex" }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--yellow)" }}>#{order.order_number}</span>
            <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8 }}>{time}</span>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: statusColor,
            padding: "3px 10px",
            borderRadius: 20,
            background: `${statusColor}20`,
          }}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
          {/* Customer Info */}
          <div style={{
            background: "var(--surface)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            border: "1px solid var(--surface-border)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{order.customer_name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>
              <Phone size={14} /> {order.customer_phone}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: order.order_type === "delivery" ? "var(--yellow)" : "var(--muted)" }}>
              {order.order_type === "delivery" ? <><MapPin size={14} /> {order.delivery_location}</> : <><Package size={14} /> Pickup</>}
            </div>
          </div>

          {/* Items */}
          <div style={{
            background: "var(--surface)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            border: "1px solid var(--surface-border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: "var(--red)", marginBottom: 10 }}>
              Order Items
            </div>
            {order.items.map((item, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                padding: "6px 0",
                borderBottom: i < order.items.length - 1 ? "1px solid var(--surface-border)" : "none",
              }}>
                <span>{item.qty}x {item.name}</span>
                <span style={{ color: "var(--yellow)", fontWeight: 600 }}>
                  {(item.price * item.qty).toLocaleString()} Br
                </span>
              </div>
            ))}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "2px solid var(--surface-border)",
              paddingTop: 10,
              marginTop: 8,
              fontWeight: 700,
              fontSize: 16,
            }}>
              <span>Total</span>
              <span style={{ color: "var(--yellow)" }}>{order.total.toLocaleString()} Br</span>
            </div>
          </div>

          {/* Payment Screenshot */}
          {order.payment_screenshot && (
            <div style={{
              background: "var(--surface)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              border: "1px solid var(--surface-border)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: "var(--red)", marginBottom: 10 }}>
                Payment Proof
              </div>
              <img
                src={order.payment_screenshot}
                alt="Payment"
                onClick={() => setLightbox(true)}
                style={{
                  width: "100%",
                  maxHeight: 250,
                  objectFit: "cover",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              />
            </div>
          )}

          {/* Reject reason */}
          {order.status === "rejected" && order.reject_reason && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              fontSize: 14,
              color: "var(--error)",
            }}>
              <strong>Rejected:</strong> {order.reject_reason}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 8 }}>
            {order.status === "pending_review" && !rejecting && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={loading}
                  onClick={() => updateStatus("confirmed")}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px 0", borderRadius: 12, border: "none",
                    background: "var(--success)", color: "var(--white)",
                    fontWeight: 600, fontSize: 15, cursor: "pointer",
                  }}
                >
                  <Check size={18} /> Confirm
                </button>
                <button
                  disabled={loading}
                  onClick={() => setRejecting(true)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px 0", borderRadius: 12, border: "none",
                    background: "var(--error)", color: "var(--white)",
                    fontWeight: 600, fontSize: 15, cursor: "pointer",
                  }}
                >
                  <X size={18} /> Reject
                </button>
              </div>
            )}

            {order.status === "pending_review" && rejecting && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--surface-border)",
                    borderRadius: 10, padding: "12px 14px", color: "var(--white)", fontSize: 15, outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={loading || !rejectReason.trim()}
                    onClick={() => updateStatus("rejected", rejectReason.trim())}
                    style={{
                      flex: 1, padding: "14px 0", borderRadius: 12, border: "none",
                      background: "var(--error)", color: "var(--white)", fontWeight: 600, fontSize: 15,
                      cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                      opacity: rejectReason.trim() ? 1 : 0.5,
                    }}
                  >
                    Reject Order
                  </button>
                  <button
                    onClick={() => { setRejecting(false); setRejectReason(""); }}
                    style={{
                      padding: "14px 20px", borderRadius: 12,
                      border: "1px solid var(--surface-border)", background: "transparent",
                      color: "var(--muted)", fontSize: 15, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {order.status === "confirmed" && (
              <button disabled={loading} onClick={() => updateStatus("preparing")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 0", borderRadius: 12, border: "none",
                background: "rgba(59,130,246,0.15)", color: "var(--blue)",
                fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                <ChefHat size={18} /> Mark Preparing
              </button>
            )}

            {order.status === "preparing" && (
              <button disabled={loading} onClick={() => updateStatus(order.order_type === "pickup" ? "ready" : "out_for_delivery")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 0", borderRadius: 12, border: "none",
                background: order.order_type === "pickup" ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
                color: order.order_type === "pickup" ? "var(--success)" : "var(--blue)",
                fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                {order.order_type === "pickup" ? <><Package size={18} /> Ready for Pickup</> : <><Truck size={18} /> Out for Delivery</>}
              </button>
            )}

            {(order.status === "ready" || order.status === "out_for_delivery") && (
              <button disabled={loading} onClick={() => updateStatus("completed")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 0", borderRadius: 12, border: "none",
                background: "var(--success)", color: "var(--white)",
                fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                <Check size={18} /> Mark Completed
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideIn {
            from { transform: translateX(30px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <button
            onClick={() => setLightbox(false)}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--white)", cursor: "pointer" }}
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
