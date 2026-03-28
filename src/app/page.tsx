"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/TopBar";
import MenuCard from "@/components/MenuCard";
import CartBar from "@/components/CartBar";
import Checkout from "@/components/Checkout";
import OrderStatusView from "@/components/OrderStatus";
import ClosedOverlay from "@/components/ClosedOverlay";
import type { MenuItem, CartItem } from "@/lib/types";

const STORAGE_KEY = "rise_order";

export default function Home() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [estimatedWait, setEstimatedWait] = useState("15");

  /* ---- Fetch menu from API ---- */
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        setMenuItems(data.items || []);
      } catch {
        /* keep empty */
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, []);

  /* ---- Fetch shop status on mount + every 60s ---- */
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setIsClosed(data.open !== true);
        if (data.estimated_wait) setEstimatedWait(data.estimated_wait);
      } catch {
        /* leave current state */
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ---- Restore active order from localStorage ---- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveOrder(saved);
      setShowStatus(true);
    }
  }, []);

  /* ---- Browser back/forward support ---- */
  useEffect(() => {
    const handlePop = () => {
      if (checkoutOpen) {
        setCheckoutOpen(false);
      } else if (showStatus) {
        setShowStatus(false);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [checkoutOpen, showStatus]);

  const pushState = useCallback(() => {
    window.history.pushState(null, "");
  }, []);

  /* ---- Derived data ---- */
  const cartItems: CartItem[] = useMemo(() => {
    return menuItems
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: quantities[item.id],
      }));
  }, [quantities, menuItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.qty, 0),
    [cartItems]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.price * i.qty, 0),
    [cartItems]
  );

  const foodItems = useMemo(
    () => menuItems.filter((i) => i.category === "food"),
    [menuItems]
  );

  const drinkItems = useMemo(
    () => menuItems.filter((i) => i.category === "drink"),
    [menuItems]
  );

  /* ---- Handlers ---- */
  const changeQty = useCallback((id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const handleOrderPlaced = useCallback(
    (orderNumber: string) => {
      setActiveOrder(orderNumber);
      setCheckoutOpen(false);
      setShowStatus(true);
      setQuantities({});
      localStorage.setItem(STORAGE_KEY, orderNumber);
      pushState();
    },
    [pushState]
  );

  const handleNewOrder = useCallback(() => {
    setShowStatus(false);
    setActiveOrder(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleMyOrders = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveOrder(saved);
    }
    setShowStatus(true);
    pushState();
  }, [pushState]);

  const openCheckout = useCallback(() => {
    setCheckoutOpen(true);
    pushState();
  }, [pushState]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  /* ---- Quick reorder ---- */
  const handleReorder = useCallback(() => {
    try {
      const saved = localStorage.getItem("rise_last_items");
      if (!saved) return;
      const lastItems: CartItem[] = JSON.parse(saved);
      const newQty: Record<string, number> = {};
      for (const item of lastItems) {
        newQty[item.id] = item.qty;
      }
      setQuantities(newQty);
      setCheckoutOpen(true);
      pushState();
    } catch {
      /* ignore bad data */
    }
  }, [pushState]);

  const hasLastOrder = typeof window !== "undefined" && !!localStorage.getItem("rise_last_items");

  /* ---- Render ---- */
  if (showStatus) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--bg)",
          color: "var(--white)",
        }}
      >
        <TopBar onMyOrders={handleMyOrders} />
        <OrderStatusView
          orderNumber={activeOrder}
          onNewOrder={handleNewOrder}
          isVisible={showStatus}
          estimatedWait={estimatedWait}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--white)",
      }}
    >
      {isClosed && <ClosedOverlay />}
      <TopBar onMyOrders={handleMyOrders} />

      <main
        style={{
          padding: "20px 16px 120px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Quick Reorder */}
        {hasLastOrder && cartCount === 0 && (
          <button
            onClick={handleReorder}
            style={{
              width: "100%",
              padding: "14px 0",
              marginBottom: 20,
              borderRadius: 12,
              border: "1.5px solid var(--yellow)",
              background: "rgba(234,179,8,0.08)",
              color: "var(--yellow)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Order Again
          </button>
        )}

        {menuLoading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--muted)",
              padding: "40px 0",
              fontSize: 14,
            }}
          >
            Loading menu...
          </div>
        )}

        {/* FOOD section */}
        {foodItems.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: "var(--red)",
                marginBottom: 12,
              }}
            >
              Food
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {foodItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  qty={quantities[item.id] ?? 0}
                  onChangeQty={(delta) => changeQty(item.id, delta)}
                />
              ))}
            </div>
          </>
        )}

        {/* DRINKS section */}
        {drinkItems.length > 0 && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: "var(--red)",
                marginTop: 24,
                marginBottom: 12,
              }}
            >
              Drinks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {drinkItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  qty={quantities[item.id] ?? 0}
                  onChangeQty={(delta) => changeQty(item.id, delta)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <CartBar count={cartCount} total={cartTotal} onOpen={openCheckout} />

      <Checkout
        isOpen={checkoutOpen}
        onClose={closeCheckout}
        items={cartItems}
        total={cartTotal}
        onOrderPlaced={handleOrderPlaced}
        onChangeQty={changeQty}
      />
    </div>
  );
}
