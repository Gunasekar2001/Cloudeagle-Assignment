import { useCallback, useEffect, useState } from "react";
import type { Density, Theme } from "../types";

/**
 * UI-only preferences kept OUT of the data reducer on purpose: theme, row
 * density and which columns are hidden don't change the data, so they live in
 * their own lightweight hook and are persisted to localStorage so the user's
 * choices survive a reload.
 */

const THEME_KEY = "table.theme";
const DENSITY_KEY = "table.density";
const HIDDEN_KEY = "table.hiddenCols";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useUiPrefs() {
  const [theme, setTheme] = useState<Theme>(() => read<Theme>(THEME_KEY, "light"));
  const [density, setDensity] = useState<Density>(() => read<Density>(DENSITY_KEY, "comfortable"));
  // A set of column keys the user has hidden.
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(read<string[]>(HIDDEN_KEY, []))
  );

  // Reflect the theme onto <html data-theme> so the CSS variables switch globally.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, JSON.stringify(density));
  }, [density]);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  }, [hidden]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    []
  );
  const toggleDensity = useCallback(
    () => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable")),
    []
  );
  const toggleColumn = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { theme, toggleTheme, density, toggleDensity, hidden, toggleColumn };
}
