import { useEffect, useRef, useState } from "react";

/** Measured container width via ResizeObserver. Charts get an explicit
 * width so they render identically in dev, prod, and headless capture —
 * Recharts' own ResponsiveContainer mis-measures on first paint there. */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
