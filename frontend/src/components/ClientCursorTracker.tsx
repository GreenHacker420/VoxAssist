"use client";

import { useEffect } from "react";

export default function ClientCursorTracker() {
  useEffect(() => {
    const root = document.documentElement;

    const setVars = (x: number, y: number) => {
      root.style.setProperty("--cursor-x", `${x}px`);
      root.style.setProperty("--cursor-y", `${y}px`);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const denom = Math.max(1, w + h);
      const s45 = ((x + y) / denom) * 100; // percentage along 45° axis
      const s135 = ((x + (h - y)) / denom) * 100; // percentage along 135° axis
      root.style.setProperty("--shine-45", `${s45}%`);
      root.style.setProperty("--shine-135", `${s135}%`);
      // configurable radius (px)
      if (!getComputedStyle(root).getPropertyValue("--shine-radius")) {
        root.style.setProperty("--shine-radius", `260px`);
      }
    };

    const onMouseMove = (e: MouseEvent) => setVars(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        setVars(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Initialize to center if not set
    if (!getComputedStyle(root).getPropertyValue("--cursor-x")) {
      setVars(window.innerWidth / 2, window.innerHeight / 2);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
