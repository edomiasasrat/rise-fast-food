"use client";

import { Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/lib/types";

interface MenuCardProps {
  item: MenuItem;
  qty: number;
  onChangeQty: (delta: number) => void;
}

export default function MenuCard({ item, qty, onChangeQty }: MenuCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderLeft: `3px solid ${qty > 0 ? "var(--yellow)" : "var(--red)"}`,
        borderRadius: 12,
        padding: "14px 14px 14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "border-color 0.2s",
      }}
    >
      {/* Left: Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--white)",
            lineHeight: 1.3,
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            marginTop: 4,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.description}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--yellow)",
            marginTop: 6,
          }}
        >
          {item.price} Birr
        </div>
      </div>

      {/* Right: Qty controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onChangeQty(-1)}
          disabled={qty <= 0}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--surface-border)",
            color: qty > 0 ? "var(--red)" : "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: qty > 0 ? "pointer" : "default",
            transition: "transform 0.1s, opacity 0.15s",
            opacity: qty > 0 ? 1 : 0.4,
          }}
          onMouseDown={(e) => {
            if (qty > 0) e.currentTarget.style.transform = "scale(0.92)";
          }}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Minus size={16} />
        </button>

        <span
          style={{
            minWidth: 20,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--white)",
          }}
        >
          {qty}
        </span>

        <button
          onClick={() => onChangeQty(1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--bg)",
            border: "1px solid var(--surface-border)",
            color: "var(--red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.1s",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
