import type { ColumnDef, Employee } from "../types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US");

/** Human-friendly display string for a cell value. */
export function formatCell(col: ColumnDef, value: Employee[keyof Employee]): string {
  if (col.key === "salary" && typeof value === "number") return currency.format(value);
  if (col.type === "number" && typeof value === "number") return number.format(value);
  return String(value);
}
