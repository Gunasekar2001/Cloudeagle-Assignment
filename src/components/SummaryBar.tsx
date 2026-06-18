import { useMemo } from "react";
import type { Employee } from "../types";

interface Props {
  /** Rows in the current view — stats are computed over exactly what's shown. */
  rows: Employee[];
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-US");

/** A compact strip of aggregate stats that recomputes as the view (search/filter) changes. */
export function SummaryBar({ rows }: Props) {
  const stats = useMemo(() => {
    const count = rows.length;
    if (count === 0) return { count: 0, avgSalary: 0, totalQty: 0, avgPerf: 0, active: 0 };
    let salary = 0;
    let qty = 0;
    let perf = 0;
    let active = 0;
    for (const r of rows) {
      salary += r.salary;
      qty += r.quantity;
      perf += r.performance;
      if (r.status === "Active") active++;
    }
    return {
      count,
      avgSalary: Math.round(salary / count),
      totalQty: qty,
      avgPerf: Math.round(perf / count),
      active,
    };
  }, [rows]);

  const items = [
    { label: "Rows in view", value: num.format(stats.count) },
    { label: "Avg salary", value: currency.format(stats.avgSalary) },
    { label: "Total quantity", value: num.format(stats.totalQty) },
    { label: "Avg performance", value: `${stats.avgPerf}` },
    { label: "Active", value: num.format(stats.active) },
  ];

  return (
    <div className="summary-bar">
      {items.map((it) => (
        <div className="summary-item" key={it.label}>
          <span className="summary-value">{it.value}</span>
          <span className="summary-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
