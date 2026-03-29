"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Upload, X, Minus, Plus, Trash2, Copy, Check } from "lucide-react";
import type { CartItem } from "@/lib/types";

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onOrderPlaced: (orderNumber: string) => void;
  onChangeQty: (id: string, delta: number) => void;
}

export default function Checkout({
  isOpen,
  onClose,
  items,
  total,
  onOrderPlaced,
  onChangeQty,
}: CheckoutProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [building, setBuilding] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    name.trim() &&
    phone.trim() &&
    screenshot &&
    items.length > 0 &&
    (orderType === "pickup" || building.trim()) &&
    !submitting;

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5 MB");
      return;
    }
    setError("");
    setScreenshot(file);
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const removeFile = useCallback(() => {
    setScreenshot(null);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || !screenshot) return;
    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("customer_name", name.trim());
      fd.append("customer_phone", phone.trim());
      fd.append("order_type", orderType);
      if (orderType === "delivery") fd.append("delivery_location", building.trim());
      fd.append("items", JSON.stringify(items));
      fd.append("payment_screenshot", screenshot);

      const res = await fetch("/api/orders", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      // Save items for quick reorder
      localStorage.setItem("rise_last_items", JSON.stringify(items));
      localStorage.setItem("rise_order", data.order.order_number);
      onOrderPlaced(data.order.order_number);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--bg)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--surface-border)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            background: "none",
            border: "none",
            color: "var(--white)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Checkout</span>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        {/* YOUR ORDER - Cart items with +/- */}
        <SectionLabel>Your Order</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 20,
            background: "var(--surface)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {items.length === 0 && (
            <div
              style={{
                padding: "20px 16px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Your cart is empty
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom:
                  idx < items.length - 1
                    ? "1px solid var(--surface-border)"
                    : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--white)",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  {item.price} Birr each
                </div>
              </div>

              {/* Qty controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginRight: 12,
                }}
              >
                <button
                  onClick={() => onChangeQty(item.id, -1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "var(--bg)",
                    border: "1px solid var(--surface-border)",
                    color: item.qty <= 1 ? "var(--error)" : "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {item.qty <= 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                </button>
                <span
                  style={{
                    minWidth: 18,
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  {item.qty}
                </span>
                <button
                  onClick={() => onChangeQty(item.id, 1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "var(--bg)",
                    border: "1px solid var(--surface-border)",
                    color: "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Line total */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--yellow)",
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                {item.price * item.qty} Birr
              </div>
            </div>
          ))}

          {/* Total row */}
          {items.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderTop: "1px solid var(--surface-border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--white)",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--yellow)",
                }}
              >
                {total} Birr
              </span>
            </div>
          )}
        </div>

        {/* YOUR INFO */}
        <SectionLabel>Your Info</SectionLabel>
        <Input
          placeholder="Name"
          value={name}
          onChange={setName}
          required
        />
        <Input
          placeholder="Phone Number"
          value={phone}
          onChange={setPhone}
          type="tel"
          required
        />

        {/* ORDER TYPE */}
        <SectionLabel>Pickup or Delivery</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {(["pickup", "delivery"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 10,
                border: `1.5px solid ${orderType === t ? "var(--red)" : "var(--surface-border)"}`,
                background: orderType === t ? "rgba(230,50,50,0.1)" : "var(--surface)",
                color: "var(--white)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {orderType === "delivery" && (
          <Input
            placeholder="Building / Dorm"
            value={building}
            onChange={setBuilding}
            required
          />
        )}

        {/* PAYMENT */}
        <SectionLabel>Payment</SectionLabel>
        <div
          style={{
            border: "1.5px solid var(--yellow)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Transfer this amount
          </span>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--yellow)",
              marginTop: 4,
            }}
          >
            {total.toFixed(0)} Birr
          </div>
        </div>
        <div
          style={{
            background: "var(--surface)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <PaymentRow label="CBE Account" value="1000XXXXXXXX" copyValue="1000XXXXXXXX" onCopy={copyText} copied={copiedField === "CBE Account"} />
          <PaymentRow label="TeleBirr" value="09XXXXXXXX" copyValue="9XXXXXXXX" onCopy={copyText} copied={copiedField === "TeleBirr"} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Account Name</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Rise Fast Food</span>
          </div>
        </div>

        {/* UPLOAD */}
        <SectionLabel>Upload Screenshot</SectionLabel>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%",
              padding: "36px 0",
              border: "2px dashed var(--surface-border)",
              borderRadius: 12,
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <Upload size={28} />
            <span style={{ fontSize: 13 }}>Tap to upload payment screenshot</span>
          </button>
        ) : (
          <div
            style={{
              position: "relative",
              marginBottom: 20,
              border: "2px solid var(--success)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Payment screenshot"
              style={{ width: "100%", maxHeight: 260, objectFit: "cover" }}
            />
            <button
              onClick={removeFile}
              aria-label="Remove screenshot"
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

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid var(--error)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              color: "var(--error)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* PLACE ORDER */}
        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 12,
            border: "none",
            background: canSubmit ? "var(--red)" : "#555",
            color: "var(--white)",
            fontSize: 16,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background 0.15s",
          }}
        >
          {submitting ? "Placing Order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}

/* ---- tiny helpers ---- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 3,
        color: "var(--red)",
        marginBottom: 10,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  required,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 10,
        border: "1.5px solid var(--surface-border)",
        background: "var(--surface)",
        color: "var(--white)",
        fontSize: 15,
        marginBottom: 12,
        outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--red)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--surface-border)")}
    />
  );
}

function PaymentRow({
  label,
  value,
  copyValue,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  copyValue: string;
  onCopy: (v: string, label: string) => void;
  copied: boolean;
}) {
  return (
    <div
      onClick={() => onCopy(copyValue, label)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        padding: "8px 0",
        transition: "opacity 0.15s",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: copied ? "var(--success)" : "var(--white)",
        transition: "color 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        {value}
        {copied ? <Check size={14} /> : <Copy size={14} style={{ color: "var(--muted)" }} />}
      </span>
    </div>
  );
}
