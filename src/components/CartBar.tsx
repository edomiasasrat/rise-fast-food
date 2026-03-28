"use client";

interface CartBarProps {
  count: number;
  total: number;
  onOpen: () => void;
}

export default function CartBar({ count, total, onOpen }: CartBarProps) {
  if (count <= 0) return null;

  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--red)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* Left: Badge + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--white)",
            color: "var(--red)",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </span>
        <span style={{ color: "var(--white)", fontSize: 15, fontWeight: 600 }}>
          Checkout
        </span>
      </div>

      {/* Right: Total */}
      <span style={{ color: "var(--white)", fontSize: 15, fontWeight: 700 }}>
        {total} Birr
      </span>
    </button>
  );
}
