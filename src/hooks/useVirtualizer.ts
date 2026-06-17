import { useCallback, useState } from "react";

export interface VirtualRange {
  /** Index of the first row to render (with overscan applied). */
  startIndex: number;
  /** Index just past the last row to render. */
  endIndex: number;
  /** Pixel height of all rows combined (drives the scrollbar). */
  totalHeight: number;
  /** Top offset, in px, of the first rendered row. */
  offsetY: number;
  /** Attach to the scroll container's onScroll. */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
}

interface Options {
  rowCount: number;
  rowHeight: number;
  /** Visible viewport height in px. */
  viewportHeight: number;
  /** Extra rows rendered above/below the viewport to avoid blank flashes. */
  overscan?: number;
}

/**
 * Minimal, dependency-free row virtualizer.
 *
 * Only the rows intersecting the viewport (plus overscan) are rendered. A
 * spacer of `totalHeight` preserves the natural scrollbar, and rendered rows
 * are pushed down by `offsetY`. This keeps the DOM at a few dozen nodes
 * regardless of dataset size (10k, 100k, ...).
 */
export function useVirtualizer({
  rowCount,
  rowHeight,
  viewportHeight,
  overscan = 8,
}: Options): VirtualRange {
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = rowCount * rowHeight;
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(rowCount, startIndex + visibleCount + overscan * 2);
  const offsetY = startIndex * rowHeight;

  return { startIndex, endIndex, totalHeight, offsetY, onScroll };
}
