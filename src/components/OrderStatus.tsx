"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, X, Upload, ShoppingBag, Loader2 } from "lucide-react";
import type { Order, OrderStatus as OrderStatusType } from "@/lib/types";

interface OrderStatusProps {
  orderNumber: string | null;
  onNewOrder: () => void;
  isVisible: boolean;
  estimatedWait?: string;
}

const STEPS: { key: OrderStatusType | "out_for_delivery"; label: string }[] = [
  { key: "pending_review", label: "Order Received" },
  { key: "confirmed", label: "Payment Review" },
  { key: "preparing", label: "Confirmed" },
  { key: "ready", label: "Preparing" },
  { key: "completed", label: "Ready / Delivering" },
];

function stepIndex(status: OrderStatusType): number {
  const map: Record<OrderStatusType, number> = {
    pending_review: 0,
    confirmed: 1,
    preparing: 2,
    ready: 3,
    out_for_delivery: 3,
    completed: 4,
    rejected: -1,
  };
  return map[status] ?? 0;
}

export default function OrderStatus({
  orderNumber,
  onNewOrder,
  isVisible,
  estimatedWait,
}: OrderStatusProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadPreview, setReuploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    try {
      const res = await fetch(`/api/orders/${orderNumber}`);
      if (!res.ok) {
        if (res.status === 404) {
          setOrder(null);
          setError("Order not found");
        }
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      setError("");
    } catch {
      /* network error — keep stale data */
    }
  }, [orderNumber]);

  /* initial fetch */
  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
  }, [orderNumber, fetchOrder]);

  /* poll every 10 s while visible */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isVisible && orderNumber) {
      intervalRef.current = setInterval(fetchOrder, 10_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, orderNumber, fetchOrder]);

  /* ---- Re-upload handlers ---- */
  const handleReuploadFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Screenshot must be under 5 MB");
      return;
    }
    setUploadError("");
    setReuploadFile(file);
    const url = URL.createObjectURL(file);
    setReuploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const removeReupload = () => {
    setReuploadFile(null);
    setReuploadPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitReupload = async () => {
    if (!reuploadFile || !orderNumber) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("payment_screenshot", reuploadFile);
      const res = await fetch(`/api/orders/${orderNumber}`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        setUploading(false);
        return;
      }
      setOrder(data.order);
      removeReupload();
    } catch {
      setUploadError("Network error. Please try again.");
    }
    setUploading(false);
  };

  /* ---- Render: no order ---- */
  if (!orderNumber) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <ShoppingBag
          size={48}
          style={{ color: "var(--muted)", margin: "0 auto 16px" }}
        />
        <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 20 }}>
          No active orders
        </p>
        <button onClick={onNewOrder} style={redBtnStyle}>
          Place an Order
        </button>
      </div>
    );
  }

  /* ---- Render: loading ---- */
  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <Loader2
          size={36}
          style={{
            color: "var(--red)",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ---- Render: error / not found ---- */
  if (!order) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "var(--error)", marginBottom: 16 }}>{error || "Order not found"}</p>
        <button onClick={onNewOrder} style={redBtnStyle}>
          Place an Order
        </button>
      </div>
    );
  }

  const isRejected = order.status === "rejected";
  const isCompleted = order.status === "completed";
  const current = stepIndex(order.status);

  return (
    <div style={{ padding: "32px 20px 40px" }}>
      {/* Icon circle */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: isRejected
            ? "rgba(239,68,68,0.15)"
            : "rgba(34,197,94,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        {isRejected ? (
          <X size={32} style={{ color: "var(--error)" }} />
        ) : (
          <Check size={32} style={{ color: "var(--success)" }} />
        )}
      </div>

      {/* Heading */}
      <h2
        style={{
          textAlign: "center",
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {isRejected
          ? "Payment Rejected"
          : isCompleted
            ? "Order Complete!"
            : "Order Placed!"}
      </h2>

      {/* Order number */}
      <p
        style={{
          textAlign: "center",
          color: "var(--yellow)",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 28,
        }}
      >
        #{order.order_number}
      </p>

      {/* Rejected: reason + re-upload */}
      {isRejected && (
        <div style={{ marginBottom: 28 }}>
          {order.reject_reason && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid var(--error)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
                color: "var(--error)",
                fontSize: 13,
              }}
            >
              {order.reject_reason}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleReuploadFile(e.target.files?.[0] ?? null)}
          />

          {!reuploadPreview ? (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100%",
                padding: "30px 0",
                border: "2px dashed var(--surface-border)",
                borderRadius: 12,
                background: "transparent",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Upload size={24} />
              <span style={{ fontSize: 13 }}>Upload new screenshot</span>
            </button>
          ) : (
            <div
              style={{
                position: "relative",
                marginBottom: 12,
                border: "2px solid var(--success)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reuploadPreview}
                alt="New screenshot"
                style={{ width: "100%", maxHeight: 200, objectFit: "cover" }}
              />
              <button
                onClick={removeReupload}
                aria-label="Remove"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "none",
                  color: "var(--white)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {uploadError && (
            <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 8 }}>
              {uploadError}
            </p>
          )}

          {reuploadFile && (
            <button
              disabled={uploading}
              onClick={submitReupload}
              style={{
                ...redBtnStyle,
                width: "100%",
                opacity: uploading ? 0.7 : 1,
                cursor: uploading ? "not-allowed" : "pointer",
                marginBottom: 8,
              }}
            >
              {uploading ? "Uploading..." : "Re-submit Screenshot"}
            </button>
          )}
        </div>
      )}

      {/* Status tracker (not shown for rejected) */}
      {!isRejected && (
        <div style={{ marginBottom: 32 }}>
          {STEPS.map((step, i) => {
            const completed = i <= current;
            const active = i === current;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={step.key} style={{ display: "flex", gap: 14 }}>
                {/* Dot + line column */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 28,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      background: completed
                        ? active
                          ? "var(--yellow)"
                          : "var(--success)"
                        : "var(--surface)",
                      color: completed ? "#000" : "var(--muted)",
                      border: completed ? "none" : "1.5px solid var(--surface-border)",
                      animation: active ? "pulse-dot 1.5s ease-in-out infinite" : "none",
                    }}
                  >
                    {completed && !active ? (
                      <Check size={14} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 24,
                        background:
                          i < current ? "var(--success)" : "var(--surface-border)",
                      }}
                    />
                  )}
                </div>
                {/* Label */}
                <div
                  style={{
                    paddingTop: 4,
                    paddingBottom: isLast ? 0 : 20,
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: completed ? "var(--white)" : "var(--muted)",
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estimated wait time - shown when confirmed (not pending_review, not rejected, not completed) */}
      {!isRejected && !isCompleted && order.status !== "pending_review" && estimatedWait && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            padding: "14px 16px",
            background: "var(--surface)",
            borderRadius: 12,
            border: "1px solid var(--surface-border)",
          }}
        >
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Estimated wait</span>
          <div style={{ color: "var(--yellow)", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            ~{estimatedWait} min
          </div>
        </div>
      )}

      {/* New Order button */}
      <button
        onClick={onNewOrder}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 12,
          border: "1.5px solid var(--surface-border)",
          background: "transparent",
          color: "var(--white)",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        New Order
      </button>
    </div>
  );
}

const redBtnStyle: React.CSSProperties = {
  padding: "14px 28px",
  borderRadius: 12,
  border: "none",
  background: "var(--red)",
  color: "var(--white)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
