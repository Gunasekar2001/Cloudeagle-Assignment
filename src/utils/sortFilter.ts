import type { Employee, Filters, SortRule, ColumnDef } from "../types";

/**
 * Global search: keep a row if ANY visible column contains the query as a
 * case-insensitive substring. Empty query is a no-op (returns the input array).
 * Returns a new array (does not mutate input).
 */
export function searchRows(
  rows: Employee[],
  query: string,
  columns: ColumnDef[]
): Employee[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const keys = columns.map((c) => c.key);
  return rows.filter((row) =>
    keys.some((k) => String(row[k]).toLowerCase().includes(q))
  );
}

/**
 * Multi-column sort. Earlier rules take precedence; ties fall through to the next rule.
 * Returns a new array (does not mutate input).
 */
export function sortRows(rows: Employee[], rules: SortRule[]): Employee[] {
  if (rules.length === 0) return rows;

  const sorted = rows.slice();
  sorted.sort((a, b) => {
    for (const { key, direction } of rules) {
      const av = a[key];
      const bv = b[key];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }
      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

/**
 * Parse a numeric filter expression. Supports:
 *   ">100", ">=100", "<50", "<=50", "=42", "10-20" (inclusive range), or a plain
 *   substring match against the formatted number.
 */
function numericMatch(value: number, expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return true;

  const range = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (range) {
    const lo = parseFloat(range[1]);
    const hi = parseFloat(range[2]);
    return value >= Math.min(lo, hi) && value <= Math.max(lo, hi);
  }

  const op = trimmed.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);
  if (op) {
    const n = parseFloat(op[2]);
    switch (op[1]) {
      case ">": return value > n;
      case "<": return value < n;
      case ">=": return value >= n;
      case "<=": return value <= n;
      case "=": return value === n;
    }
  }

  // Fallback: substring match on the raw number.
  return String(value).includes(trimmed);
}

/**
 * Apply per-column filters. Text columns use case-insensitive substring matching,
 * numeric columns support comparison operators (see numericMatch).
 * Returns a new array (does not mutate input).
 */
export function filterRows(
  rows: Employee[],
  filters: Filters,
  columns: ColumnDef[]
): Employee[] {
  const active = Object.entries(filters).filter(([, v]) => v && v.trim() !== "");
  if (active.length === 0) return rows;

  const colByKey = new Map(columns.map((c) => [c.key, c]));

  return rows.filter((row) =>
    active.every(([key, raw]) => {
      const col = colByKey.get(key as keyof Employee);
      const value = row[key as keyof Employee];
      if (col?.type === "number" && typeof value === "number") {
        return numericMatch(value, raw as string);
      }
      return String(value).toLowerCase().includes((raw as string).toLowerCase());
    })
  );
}
