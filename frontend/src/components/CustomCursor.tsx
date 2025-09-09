"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });
  const target = useRef({ x: pos.current.x, y: pos.current.y });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.appendChild(dot);
    dotRef.current = dot;

    document.body.classList.add("custom-cursor");

    const update = () => {
      // simple lerp for a tiny smoothness
      pos.current.x += (target.current.x - pos.current.x) * 0.25;
      pos.current.y += (target.current.y - pos.current.y) * 0.25;
      dotRef.current?.style.setProperty("--cx", `${pos.current.x}px`);
      dotRef.current?.style.setProperty("--cy", `${pos.current.y}px`);
      raf.current = requestAnimationFrame(update);
    };

    const handleMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      dotRef.current?.classList.add("visible");
    };

    const handleEnter = () => dotRef.current?.classList.add("visible");
    const handleLeave = () => dotRef.current?.classList.remove("visible");

    const handleDown = () => {
      const el = dotRef.current;
      if (!el) return;
      el.classList.add("active");
      // brief tap effect
      setTimeout(() => el.classList.remove("active"), 140);
    };

    const interactiveSelector = 'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]';
    const typingSelector = 'input, textarea, [contenteditable="true"], .editor, .CodeMirror, .monaco-editor';
    const graphSelector = '.recharts-wrapper, .recharts-surface, canvas, svg.recharts-surface, .chart';
    const handleOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const isTyping = !!t.closest(typingSelector);
      const isGraph = !!t.closest(graphSelector);
      const isInteractive = !!t.closest(interactiveSelector);

      if (isTyping || isGraph) {
        dotRef.current?.classList.add("native");
        dotRef.current?.classList.remove("hover");
        dotRef.current?.classList.add("typing"); // reuse for opacity hide
        return;
      }

      dotRef.current?.classList.remove("native");
      dotRef.current?.classList.remove("typing");

      if (isInteractive) {
        dotRef.current?.classList.add("hover");
      } else {
        dotRef.current?.classList.remove("hover");
      }
    };

    const handleTouch = () => {
      // hide on touch devices
      dotRef.current?.classList.remove("visible");
    };

    // Initialize position
    dot.style.setProperty("--cx", `${pos.current.x}px`);
    dot.style.setProperty("--cy", `${pos.current.y}px`);

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mousemove", handleOver, { passive: true });
    window.addEventListener("mouseenter", handleEnter);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("touchstart", handleTouch, { passive: true });

    raf.current = requestAnimationFrame(update);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousemove", handleOver);
      window.removeEventListener("mouseenter", handleEnter);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("touchstart", handleTouch);
      document.body.classList.remove("custom-cursor");
      if (dotRef.current) {
        document.body.removeChild(dotRef.current);
      }
    };
  }, []);

  return null;
}
