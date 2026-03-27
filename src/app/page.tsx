"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/TopBar";
import MenuCard from "@/components/MenuCard";
import CartBar from "@/components/CartBar";
import CartDrawer from "@/components/CartDrawer";
import Checkout from "@/components/Checkout";
import OrderStatusView from "@/components/OrderStatus";
import ClosedOverlay from "@/components/ClosedOverlay";
import { menuItems } from "@/lib/menu";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "rise_order";

export default function Home() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  /* ---- Fetch shop status on mount + every 60s ---- */
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setIsClosed(data.open !== true);
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
      // Close overlays in reverse stacking order
      if (checkoutOpen) {
        setCheckoutOpen(false);
      } else if (cartOpen) {
        setCartOpen(false);
      } else if (showStatus) {
        setShowStatus(false);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [checkoutOpen, cartOpen, showStatus]);

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
  }, [quantities]);

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
    []
  );

  const drinkItems = useMemo(
    () => menuItems.filter((i) => i.category === "drink"),
    []
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

  const openCart = useCallback(() => {
    setCartOpen(true);
    pushState();
  }, [pushState]);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const openCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutOpen(true);
    pushState();
  }, [pushState]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

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
        {/* FOOD section */}
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

        {/* DRINKS section */}
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
      </main>

      <CartBar count={cartCount} total={cartTotal} onOpen={openCart} />

      <CartDrawer
        isOpen={cartOpen}
        onClose={closeCart}
        items={cartItems}
        total={cartTotal}
        onCheckout={openCheckout}
      />

      <Checkout
        isOpen={checkoutOpen}
        onClose={closeCheckout}
        items={cartItems}
        total={cartTotal}
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}
