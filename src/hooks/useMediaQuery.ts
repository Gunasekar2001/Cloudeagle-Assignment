import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query and re-render when it changes.
 * Used to switch the table between the desktop grid and the mobile card layout.
 *
 * @example const isMobile = useMediaQuery("(max-width: 700px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // sync immediately in case the query changed between renders
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
