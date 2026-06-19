import { useCallback, useRef, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

/**
 * Measure an element's content box and keep it in sync via ResizeObserver.
 *
 * react-window's FixedSizeList needs an explicit pixel height to know how many
 * rows fit; this hook supplies that height from whatever space the flex layout
 * gives the table region — so the list fills the viewport instead of using a
 * hard-coded height.
 *
 * Returns a `ref` callback to attach to the container and the latest `size`.
 * The observer is disconnected automatically when the node detaches.
 */
export function useElementSize(): [(node: HTMLElement | null) => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    // Clean up any previous observer (node replaced or unmounted).
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return [ref, size];
}
