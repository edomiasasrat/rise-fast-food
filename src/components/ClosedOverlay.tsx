"use client";

import { Clock } from "lucide-react";

export default function ClosedOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(10, 10, 10, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
      }}
    >
      <Clock size={48} color="var(--muted)" strokeWidth={1.5} />
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--white)",
          marginTop: 8,
        }}
      >
        We&apos;re Closed
      </h1>
      <p
        style={{
          fontSize: 16,
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        Come back at{" "}
        <span style={{ color: "var(--yellow)", fontWeight: 600 }}>7:00 AM</span>
      </p>
    </div>
  );
}
