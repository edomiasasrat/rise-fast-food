"use client";

import { useRef, useEffect } from "react";

export default function AudioNotifier({ orderCount }: { orderCount: number }) {
  const prevCount = useRef(orderCount);

  useEffect(() => {
    if (orderCount > prevCount.current) {
      try {
        const ctx = new AudioContext();
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.value = 800;
        gain1.gain.value = 0.3;
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.value = 1000;
          gain2.gain.value = 0.3;
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.3);
        }, 400);
      } catch {
        // Audio not available
      }
    }
    prevCount.current = orderCount;
  }, [orderCount]);

  return null;
}
