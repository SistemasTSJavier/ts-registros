"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Tras navegar a una URL con #fragmento, asegura scroll al elemento con ese id. */
export function ScrollToHash() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [pathname]);

  return null;
}
